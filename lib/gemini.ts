import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type SafetySetting,
  type GenerativeModel,
} from "@google/generative-ai";

// Read at request time, not module load (Workers lazy env)
export function getModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
}

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
    model: getModelName(),
    safetySettings,
  });
}
