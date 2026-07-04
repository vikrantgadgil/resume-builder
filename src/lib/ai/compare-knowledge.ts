import { getDeepSeekClient } from "./deepseek";
import {
  factComparisonResponseSchema,
  skeletonComparisonResponseSchema,
  type FactClassification,
  type SkeletonClassification,
} from "@/types/reconciliation";

async function callDeepSeekComparison(
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown | null> {
  try {
    const client = getDeepSeekClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function compareSkeletonPairs(
  kind: "role" | "education" | "certification",
  pairs: { existingLabel: string; candidateLabel: string }[],
): Promise<Map<number, SkeletonClassification> | null> {
  if (pairs.length === 0) return new Map();

  const systemPrompt = `You compare pairs of ${kind} entries from resumes. For each pair, classify the relationship as exactly one of: "duplicate" (same real-world ${kind}, phrased identically or near-identically), "likely_same" (same real-world ${kind}, but phrased differently: abbreviated versus spelled out, casing differences, added or removed scope, acronym versus expanded form), or "different" (genuinely different ${kind}s). Respond with JSON only in this exact shape: { "results": [{ "pairIndex": number, "classification": "duplicate" | "likely_same" | "different" }] }, one result per pair given, using the pairIndex provided. No other text.`;

  const userPrompt = pairs
    .map(
      (pair, index) =>
        `Pair ${index}:\nExisting: ${pair.existingLabel}\nCandidate: ${pair.candidateLabel}`,
    )
    .join("\n\n");

  const raw = await callDeepSeekComparison(systemPrompt, userPrompt);
  if (raw === null) return null;

  const parsed = skeletonComparisonResponseSchema.safeParse(raw);
  if (!parsed.success) return null;

  const map = new Map<number, SkeletonClassification>();
  for (const result of parsed.data.results) {
    map.set(result.pairIndex, result.classification);
  }
  return map;
}

export async function compareFactPairs(
  pairs: { existingText: string; candidateText: string }[],
): Promise<Map<number, FactClassification> | null> {
  if (pairs.length === 0) return new Map();

  const systemPrompt = `You compare pairs of resume facts, which are freeform claims about someone's experience. For each pair, classify the relationship as exactly one of: "duplicate" (same claim, same level of detail, phrased differently), "overlapping" (same underlying claim but at a different level of detail, for example a short skill phrase versus a full narrative sentence describing the same thing), or "distinct" (genuinely different claims, even if they share a topic or tag). Respond with JSON only in this exact shape: { "results": [{ "pairIndex": number, "classification": "duplicate" | "overlapping" | "distinct" }] }, one result per pair given, using the pairIndex provided. No other text.`;

  const userPrompt = pairs
    .map(
      (pair, index) =>
        `Pair ${index}:\nExisting: ${pair.existingText}\nCandidate: ${pair.candidateText}`,
    )
    .join("\n\n");

  const raw = await callDeepSeekComparison(systemPrompt, userPrompt);
  if (raw === null) return null;

  const parsed = factComparisonResponseSchema.safeParse(raw);
  if (!parsed.success) return null;

  const map = new Map<number, FactClassification>();
  for (const result of parsed.data.results) {
    map.set(result.pairIndex, result.classification);
  }
  return map;
}
