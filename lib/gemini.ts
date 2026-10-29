import { GoogleGenAI, HarmBlockThreshold, HarmCategory, type SafetySetting } from "@google/genai";

// Every AI call in Dime goes through `ask`. It uses Google's current Gen AI
// SDK and Flash-Lite model, retries when Google is busy, and falls back to
// the "latest Flash-Lite" alias if the pinned model is ever retired, so a
// model shutdown can't take logging down with it.

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODEL = "gemini-flash-lite-latest";
const RETRY_DELAYS = [1500, 3500];

// Read at request time, not module load (Workers populate env lazily).
const modelName = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

// Parsing what people bought shouldn't trip on "Uber at 2am" or a sex shop
// receipt; still block the genuinely bad stuff.
const PARSE_SAFETY: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

type AskOptions = {
  /** Ask for raw JSON back (no code fences, no prose). */
  json?: boolean;
  /** Use the relaxed safety settings meant for parsing expenses. */
  parse?: boolean;
};

const statusOf = (e: unknown) => (e as { status?: number; code?: number })?.status ?? (e as { code?: number })?.code;

export async function ask(apiKey: string, prompt: string, { json = false, parse = false }: AskOptions = {}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const config = {
    ...(json ? { responseMimeType: "application/json" } : {}),
    ...(parse ? { safetySettings: PARSE_SAFETY } : {}),
  };

  let model = modelName();
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await ai.models.generateContent({ model, contents: prompt, config });
      return (res.text ?? "").trim();
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      if (status === 404 && model !== FALLBACK_MODEL) {
        model = FALLBACK_MODEL; // pinned model retired: switch, don't wait
        continue;
      }
      if ((status === 429 || status === 503) && attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/** Pull JSON out of a reply, tolerating stray code fences. */
export function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced ? fenced[1] : text).trim());
}

/** Models love **markdown**. Dime shows plain text, so strip it. */
export function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^["“]+|["”]+$/g, "")
    .trim();
}
