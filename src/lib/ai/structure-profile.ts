import { getDeepSeekClient } from "./deepseek";
import {
  structuredProfileSchema,
  profileContentSchema,
  type StructuredProfile,
  type ProfileContent,
} from "@/types/profile";

const SYSTEM_INSTRUCTIONS = `You structure resume text into JSON. You reorganize and rephrase only what is already present in the text given to you. You never invent an employer, job title, date, degree, school, or skill that is not present in the source text. If a field cannot be found in the source text, leave it as an empty string or empty array. Respond with JSON only, no other text.`;

const HEADER_AND_CONTENT_SHAPE = `{
  "header": {
    "name": string,
    "email": string,
    "phone": string,
    "location": string,
    "linkedin": string,
    "github": string
  },
  "content": {
    "summary": string,
    "experience": [{ "company": string, "title": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] }],
    "education": [{ "institution": string, "degree": string, "field": string, "startDate": string, "endDate": string, "details": string }],
    "skills": string[],
    "projects": [{ "name": string, "description": string, "bullets": string[], "link": string }]
  }
}`;

const CONTENT_ONLY_SHAPE = `{
  "summary": string,
  "experience": [{ "company": string, "title": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] }],
  "education": [{ "institution": string, "degree": string, "field": string, "startDate": string, "endDate": string, "details": string }],
  "skills": string[],
  "projects": [{ "name": string, "description": string, "bullets": string[], "link": string }]
}`;

type StructureFullResult =
  | { success: true; data: StructuredProfile }
  | { success: false; reason: string };

type StructureContentResult =
  | { success: true; data: ProfileContent }
  | { success: false; reason: string };

async function callDeepSeekJSON(
  userPrompt: string,
): Promise<unknown | null> {
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

export async function structureFullProfile(
  rawText: string,
): Promise<StructureFullResult> {
  const prompt = `Structure the following resume text into this exact JSON shape, using only information present in the text:\n\n${HEADER_AND_CONTENT_SHAPE}\n\nResume text:\n${rawText}`;

  const raw = await callDeepSeekJSON(prompt);
  if (raw === null) {
    return { success: false, reason: "The AI request failed or returned no content." };
  }

  const parsed = structuredProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      reason: "The AI response did not match the expected profile shape.",
    };
  }

  return { success: true, data: parsed.data };
}

export async function structureProfileContent(
  rawText: string,
): Promise<StructureContentResult> {
  const prompt = `Structure the following resume text into this exact JSON shape, using only information present in the text. Do not include header or contact information, only summary, experience, education, skills, and projects:\n\n${CONTENT_ONLY_SHAPE}\n\nResume text:\n${rawText}`;

  const raw = await callDeepSeekJSON(prompt);
  if (raw === null) {
    return { success: false, reason: "The AI request failed or returned no content." };
  }

  const parsed = profileContentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      reason: "The AI response did not match the expected profile shape.",
    };
  }

  return { success: true, data: parsed.data };
}
