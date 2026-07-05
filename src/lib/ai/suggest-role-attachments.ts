import { DEEPSEEK_MODEL, getDeepSeekClient } from "./deepseek";
import { roleAttachmentSuggestionResponseSchema } from "@/types/role-attachment";
import type { AttachmentConfidence } from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You match resume facts to the specific job role they belong to. You are given a numbered list of facts and a numbered list of roles (employer and title). For each fact, decide whether it clearly belongs to one specific role, based on a company name it mentions, a role-specific initiative or program name, or context matching that role. If so, respond with that role's index and a confidence of "high", "medium", or "low". If the fact is generic, cross-cutting, a leadership or philosophy statement that could apply to any role, or you are not confident, respond with roleIndex null and confidence null. Do not guess and do not default to the most recent or most senior role. You are matching existing facts to existing roles only, you never change the fact text and never invent a role. Respond with JSON only in this exact shape: { "suggestions": [{ "factIndex": number, "roleIndex": number | null, "confidence": "high" | "medium" | "low" | null }] }, one entry per fact given, using the factIndex provided. No other text.`;

export type RoleAttachmentSuggestion = {
  factIndex: number;
  roleIndex: number | null;
  confidence: AttachmentConfidence | null;
};

export async function suggestRoleAttachments(
  facts: { text: string }[],
  roles: { employer: string; title: string }[],
): Promise<RoleAttachmentSuggestion[] | null> {
  if (facts.length === 0 || roles.length === 0) return [];

  const factsList = facts
    .map((f, i) => `Fact ${i}: ${f.text}`)
    .join("\n");
  const rolesList = roles
    .map((r, i) => `Role ${i}: ${r.title} at ${r.employer}`)
    .join("\n");

  const userPrompt = `Roles:\n${rolesList}\n\nFacts:\n${factsList}`;

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
    if (!raw) return null;

    const parsed = roleAttachmentSuggestionResponseSchema.safeParse(
      JSON.parse(raw),
    );
    if (!parsed.success) return null;

    return parsed.data.suggestions;
  } catch {
    return null;
  }
}
