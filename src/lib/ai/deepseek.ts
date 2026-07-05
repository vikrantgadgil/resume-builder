import OpenAI from "openai";

// deepseek-chat and deepseek-reasoner deprecate 2026-07-24 and map to
// deepseek-v4-flash. deepseek-v4-pro is the stronger tier, used here since
// generation quality is the core value proposition of this tool.
export const DEEPSEEK_MODEL = "deepseek-v4-pro";

export function getDeepSeekClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}
