import { getDeepSeekClient } from "./deepseek";
import {
  extractionResultSchema,
  profileHeaderSchema,
  type ExtractionResult,
  type ProfileHeader,
} from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You extract information from resume text into JSON. You only extract what is present in the text given to you. You never invent an employer, job title, date, degree, school, certification, or skill that is not present in the source text. Break the resume down into two kinds of output: a skeleton (roles, education, certifications, using only the fields asked for) and facts (every other claim: bullet points, achievements, skills, summary statements, each as its own short freeform sentence, optionally tagged with loose themes such as cyber, pmo, sap, transformation, leadership, cloud). If a field cannot be found in the source text, leave it as an empty string or empty array. Respond with JSON only, no other text.`;

const SKELETON_AND_FACTS_FIELDS = `"roles": [{ "employer": string, "title": string, "startDate": string, "endDate": string, "location": string }],
  "education": [{ "institution": string, "degree": string, "field": string, "year": string }],
  "certifications": [{ "name": string, "issuer": string, "year": string }],
  "facts": [{ "text": string, "tags": string[] }]`;

const SKELETON_AND_FACTS_SHAPE = `{\n  ${SKELETON_AND_FACTS_FIELDS}\n}`;

const HEADER_AND_SKELETON_SHAPE = `{
  "header": {
    "name": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string,
    "github": string
  },
  ${SKELETON_AND_FACTS_FIELDS}
}`;

type ExtractFullResult =
  | { success: true; header: ProfileHeader; data: ExtractionResult }
  | { success: false; reason: string };

type ExtractUpdateResult =
  | { success: true; data: ExtractionResult }
  | { success: false; reason: string };

async function callDeepSeekJSON(userPrompt: string): Promise<unknown | null> {
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
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function extractFullKnowledgeBase(
  rawText: string,
): Promise<ExtractFullResult> {
  const prompt = `Extract the following resume text into this exact JSON shape, using only information present in the text:\n\n${HEADER_AND_SKELETON_SHAPE}\n\nResume text:\n${rawText}`;

  const raw = await callDeepSeekJSON(prompt);
  if (raw === null || typeof raw !== "object") {
    return { success: false, reason: "The AI request failed or returned no content." };
  }

  const headerResult = profileHeaderSchema.safeParse(
    (raw as Record<string, unknown>).header,
  );
  const dataResult = extractionResultSchema.safeParse(raw);

  if (!headerResult.success || !dataResult.success) {
    return {
      success: false,
      reason: "The AI response did not match the expected shape.",
    };
  }

  return { success: true, header: headerResult.data, data: dataResult.data };
}

export async function extractKnowledgeBaseUpdate(
  rawText: string,
): Promise<ExtractUpdateResult> {
  const prompt = `Extract the following resume text into this exact JSON shape, using only information present in the text. Do not include header or contact information:\n\n${SKELETON_AND_FACTS_SHAPE}\n\nResume text:\n${rawText}`;

  const raw = await callDeepSeekJSON(prompt);
  if (raw === null) {
    return { success: false, reason: "The AI request failed or returned no content." };
  }

  const parsed = extractionResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      reason: "The AI response did not match the expected shape.",
    };
  }

  return { success: true, data: parsed.data };
}
