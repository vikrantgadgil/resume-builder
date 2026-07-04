import { getDeepSeekClient } from "./deepseek";
import { factSelectionResponseSchema } from "@/types/tailoring";
import type { Role } from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You select the most relevant facts from a candidate's career knowledge base for a specific job description. You are given the job description, a list of important keywords extracted from it, and every fact in the knowledge base with the role it belongs to, or "unattached" if it does not belong to a specific role. Select the facts most relevant to this job description, prioritizing alignment with the job's requirements and keywords. Aim for roughly 3 to 4 of the most relevant facts for each role that has any relevant facts, and up to about 6 of the most relevant unattached facts, so the result reads as a focused two-page resume rather than an exhaustive list. Do not select a fact just to fill space if it is not relevant to this job description. You are selecting existing facts only, you never invent a fact or alter its text. Respond with JSON only in this exact shape: { "selectedFactIds": [string, ...] }, using the exact fact ids given. No other text.`;

type SelectResult =
  | { success: true; selectedFactIds: string[] }
  | { success: false; reason: string };

type FactForSelection = { id: string; text: string; roleRef: string | null };

export async function selectRelevantFacts(
  jobDescription: string,
  keywords: string[],
  roles: Role[],
  facts: FactForSelection[],
): Promise<SelectResult> {
  if (facts.length === 0) {
    return { success: true, selectedFactIds: [] };
  }

  const factLines = facts
    .map((fact) => {
      const role = fact.roleRef
        ? roles.find((r) => r.id === fact.roleRef)
        : null;
      const context = role ? `${role.title} at ${role.employer}` : "unattached";
      return `Fact ${fact.id} [${context}]: ${fact.text}`;
    })
    .join("\n");

  const userPrompt = `Job description:\n${jobDescription}\n\nKeywords: ${keywords.join(", ")}\n\nFacts:\n${factLines}`;

  try {
    const client = getDeepSeekClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return { success: false, reason: "The AI request failed or returned no content." };
    }

    const parsed = factSelectionResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        success: false,
        reason: "The AI response did not match the expected shape.",
      };
    }

    const validFactIds = new Set(facts.map((f) => f.id));
    const selectedFactIds = parsed.data.selectedFactIds.filter((id) =>
      validFactIds.has(id),
    );

    return { success: true, selectedFactIds };
  } catch {
    return { success: false, reason: "The AI request failed or returned no content." };
  }
}
