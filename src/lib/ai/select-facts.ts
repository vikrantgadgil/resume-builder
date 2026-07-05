import { DEEPSEEK_MODEL, getDeepSeekClient } from "./deepseek";
import { factSelectionResponseSchema } from "@/types/tailoring";
import type { Role } from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You select the most relevant facts from a candidate's career knowledge base for a specific job description, to be phrased as resume bullets that make full, effective use of a two-page resume. You are given the job description, important keywords extracted from it, and every fact in the knowledge base with the role it belongs to, or "unattached" if it does not belong to a specific role.

Follow these rules:

1. Avoid near-duplicates. If multiple facts describe the same underlying claim or achievement, even if worded differently, select only the single best-phrased or most specific one. Never select two facts that are substantially the same claim.

2. Cover multiple relevant roles, not just one. If more than one role has facts relevant to this job description, select meaningfully from each relevant role, roughly proportional to how relevant that role is, rather than concentrating almost all selections on a single role (typically the most recent) while leaving other relevant roles with only one fact or none. A resume that only shows depth in one role when the candidate has several relevant roles undersells the candidate.

3. Make full use of the available two-page budget when the knowledge base supports it. If a role has several distinct, relevant, non-duplicate facts, select enough of them, typically 3 to 6, to demonstrate real depth in that role, rather than an arbitrarily small number. Aim for a total selection across all roles and unattached highlights that would fill close to two pages once phrased, not a sparse handful, whenever the knowledge base genuinely has that much relevant material. Do not pad with irrelevant facts just to hit a count. If the knowledge base genuinely lacks relevant material, a shorter selection is correct, do not invent relevance that is not there.

4. Prioritize facts that align with the job description's specific requirements and keywords over generic statements, when both are available.

You are selecting existing facts only, you never invent a fact or alter its text. Respond with JSON only in this exact shape: { "selectedFactIds": [string, ...] }, using the exact fact ids given. No other text.`;

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
      model: DEEPSEEK_MODEL,
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
