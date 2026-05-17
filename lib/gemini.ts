import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type SafetySetting,
  type GenerativeModel,
} from "@google/generative-ai";

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

export const PARSE_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export function getGeminiModel(
  apiKey: string,
  safetySettings?: SafetySetting[]
): GenerativeModel {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_MODEL,
    safetySettings,
  });
}
