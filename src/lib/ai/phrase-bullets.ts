import { DEEPSEEK_MODEL, getDeepSeekClient } from "./deepseek";
import { phraseBulletsResponseSchema } from "@/types/tailoring";

const SYSTEM_INSTRUCTIONS = `You phrase resume facts as polished, job-description-adapted resume bullets. You are given the job description, important keywords and priorities extracted from it, and a list of facts with stable ids. For each fact, rewrite it as a single concise resume bullet that actively incorporates this job description's specific vocabulary, terminology, and priorities wherever the underlying fact genuinely supports that framing. Do not simply pass through the original wording unchanged: actively adapt phrasing, word choice, and emphasis toward this specific job description while keeping every underlying claim, number, and scope from the original fact intact. You may shorten, reorder, or tighten wording for concision. You must not add any claim, number, scope, employer, title, or skill that is not already present in the original fact text, and you must not invent an achievement or metric. Respond with JSON only in this exact shape: { "bullets": [{ "factId": string, "phrasedText": string }] }, one entry per fact given, using the exact fact id given. No other text.`;

export type PhrasedBullet = { factId: string; phrasedText: string };

type PhraseResult =
  | { success: true; bullets: PhrasedBullet[] }
  | { success: false; reason: string };

export async function phraseBullets(
  jobDescription: string,
  keywords: string[],
  facts: { id: string; text: string }[],
): Promise<PhraseResult> {
  if (facts.length === 0) {
    return { success: true, bullets: [] };
  }

  const factLines = facts.map((f) => `${f.id}: ${f.text}`).join("\n");
  const userPrompt = `Job description:\n${jobDescription}\n\nKeywords: ${keywords.join(", ")}\n\nFacts to phrase:\n${factLines}`;

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

    const parsed = phraseBulletsResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        success: false,
        reason: "The AI response did not match the expected shape.",
      };
    }

    const validFactIds = new Set(facts.map((f) => f.id));
    const bullets = parsed.data.bullets.filter((b) => validFactIds.has(b.factId));

    return { success: true, bullets };
  } catch {
    return { success: false, reason: "The AI request failed or returned no content." };
  }
}
