import { getDeepSeekClient } from "./deepseek";
import { phraseBulletsResponseSchema } from "@/types/tailoring";

const SYSTEM_INSTRUCTIONS = `You phrase resume facts as polished resume bullets for a specific job description. You are given the job description, important keywords, and a list of facts with stable ids. For each fact, rewrite it as a single concise resume bullet, naturally incorporating relevant keywords from the job description only where the underlying fact genuinely supports that keyword. You may shorten, reorder, or tighten the wording for concision. You must not add any claim, number, scope, employer, title, or skill that is not already present in the original fact text, and you must not invent an achievement or metric. If a fact does not benefit from rewording, you may return it close to unchanged. Respond with JSON only in this exact shape: { "bullets": [{ "factId": string, "phrasedText": string }] }, one entry per fact given, using the exact fact id given. No other text.`;

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
