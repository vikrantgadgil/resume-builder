import { DEEPSEEK_MODEL, getDeepSeekClient } from "./deepseek";
import {
  extractionResultSchema,
  profileHeaderSchema,
  type ExtractionResult,
  type ProfileHeader,
} from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You synthesize a single, coherent career knowledge base from multiple source documents describing the same person, for example several versions of their resume, or a resume plus a LinkedIn export or notes. You only use information present in the sources given to you. You never invent an employer, job title, date, degree, school, certification, or skill that is not present in at least one source.

Treat all sources together as describing one person's career, not as separate people or separate imports. Produce one deduplicated skeleton: if the same real role, degree, or certification appears in more than one source, phrased differently or with different detail, merge it into a single entry using the most complete and accurate phrasing across all sources. Do not create separate entries for the same real thing.

Extract facts, meaning bullet points, achievements, skills, and summary statements, from all sources combined, each as its own short freeform sentence. Do not include two facts that make the same underlying claim just because it appeared in more than one source. Keep the single best-phrased or most specific version and drop the redundant restatement.

For each fact, also decide whether it clearly belongs to one specific role, based on which source and job section it came from, a company name it mentions, a role-specific initiative or program name, or a timeframe matching that role's dates. If so, set suggestedRoleEmployer and suggestedRoleTitle to match that role's employer and title exactly as you wrote them in the roles array, and set confidence to "high", "medium", or "low". If the fact is generic, cross-cutting, or you are not confident, leave suggestedRoleEmployer and suggestedRoleTitle as empty strings and confidence as null. Do not guess and do not default to the most recent or most senior role.

If a field cannot be found in any source, leave it as an empty string or empty array. Respond with JSON only, no other text.`;

const SHAPE = `{
  "header": {
    "name": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string,
    "github": string
  },
  "roles": [{ "employer": string, "title": string, "startDate": string, "endDate": string, "location": string }],
  "education": [{ "institution": string, "degree": string, "field": string, "year": string }],
  "certifications": [{ "name": string, "issuer": string, "year": string }],
  "facts": [{ "text": string, "tags": string[], "suggestedRoleEmployer": string, "suggestedRoleTitle": string, "confidence": "high" | "medium" | "low" | null }]
}`;

// Both current DeepSeek models support a 1M token context window, well
// beyond what a realistic set of one person's resume sources requires. This
// is a cost and prompt-size safety cap, not a context-fit workaround, and
// chunking is intentionally not implemented since combined source text for a
// single person's resumes will not realistically approach it.
const MAX_COMBINED_SOURCE_CHARS = 200_000;

export type SynthesisSource = { label: string; text: string };

type SynthesisResult =
  | { success: true; header: ProfileHeader; data: ExtractionResult }
  | { success: false; reason: string };

export async function synthesizeKnowledgeBase(
  sources: SynthesisSource[],
): Promise<SynthesisResult> {
  const combinedLength = sources.reduce((sum, s) => sum + s.text.length, 0);
  if (combinedLength > MAX_COMBINED_SOURCE_CHARS) {
    return {
      success: false,
      reason: `Combined source text is too large (${combinedLength.toLocaleString()} characters). Remove a file and try again with fewer sources at once.`,
    };
  }

  const sourcesText = sources
    .map((s) => `=== Source: ${s.label} ===\n${s.text}`)
    .join("\n\n");

  const prompt = `Synthesize the following sources into this exact JSON shape, using only information present in the sources:\n\n${SHAPE}\n\n${sourcesText}`;

  try {
    const client = getDeepSeekClient();
    const response = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return { success: false, reason: "The AI request failed or returned no content." };
    }

    const parsedRaw = JSON.parse(raw);
    const headerResult = profileHeaderSchema.safeParse(
      (parsedRaw as Record<string, unknown>).header,
    );
    const dataResult = extractionResultSchema.safeParse(parsedRaw);

    if (!headerResult.success || !dataResult.success) {
      return {
        success: false,
        reason: "The AI response did not match the expected shape.",
      };
    }

    return { success: true, header: headerResult.data, data: dataResult.data };
  } catch {
    return { success: false, reason: "The AI request failed or returned no content." };
  }
}
