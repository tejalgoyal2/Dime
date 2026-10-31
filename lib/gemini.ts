import { GoogleGenAI, HarmBlockThreshold, HarmCategory, ThinkingLevel, type SafetySetting } from "@google/genai";

// Every AI call in Dime goes through `ask`. It uses Google's current Gen AI
// SDK and Flash-Lite model, retries when Google is busy, and falls back to
// the "latest Flash-Lite" alias if the pinned model is ever retired, so a
// model shutdown can't take logging down with it.
//
// Speed: newer Gemini models "think" before answering by default, which adds
// seconds. Reading "coffee 5" doesn't need deep thought, so thinking is set to
// minimal. If a model doesn't accept that setting, we drop it and carry on.

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
  /** Told which provider answered ("groq" or "gemini"), for timing headers. */
  onProvider?: (p: "groq" | "gemini") => void;
};

const statusOf = (e: unknown) => (e as { status?: number; code?: number })?.status ?? (e as { code?: number })?.code;

// Groq runs open models on its own chips at ~1,000 tokens a second, which
// makes replies feel instant. When GROQ_API_KEY is set it answers first and
// Gemini is the backup; without it, Gemini does everything as before.
const GROQ_MODEL = "openai/gpt-oss-20b";

async function askGroq(prompt: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 1200,
      reasoning_effort: "low",
      include_reasoning: false,
    }),
    // If Groq is slow today, don't make you wait: fall back to Gemini.
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw Object.assign(new Error(`Groq ${res.status}`), { status: res.status });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned nothing");
  return text;
}

export async function ask(apiKey: string, prompt: string, opts: AskOptions = {}): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    try {
      const text = await askGroq(prompt);
      // If we needed JSON and Groq's answer isn't readable, let Gemini try.
      if (opts.json) parseJson(text);
      opts.onProvider?.("groq");
      return text;
    } catch (e) {
      console.warn("Groq failed, using Gemini:", e instanceof Error ? e.message : e);
      if (!apiKey) throw e;
    }
  }
  const text = await askGemini(apiKey, prompt, opts);
  opts.onProvider?.("gemini");
  return text;
}

async function askGemini(apiKey: string, prompt: string, { json = false, parse = false }: AskOptions = {}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const base = {
    ...(json ? { responseMimeType: "application/json" } : {}),
    ...(parse ? { safetySettings: PARSE_SAFETY } : {}),
  };
  let quick = true;

  let model = modelName();
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const config = quick ? { ...base, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : base;
      const res = await ai.models.generateContent({ model, contents: prompt, config });
      return (res.text ?? "").trim();
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      if (status === 400 && quick) {
        quick = false; // this model doesn't take a thinking level: ask normally
        attempt--;
        continue;
      }
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

/** Pull JSON out of a reply, tolerating stray code fences or a sentence around it. */
export function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body);
  } catch {
    // Some models wrap JSON in a line of prose; take the outermost {...} or [...].
    const start = body.search(/[[{]/);
    const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new Error("No JSON in reply");
  }
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
