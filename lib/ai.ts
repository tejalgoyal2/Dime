import { GoogleGenAI, HarmBlockThreshold, HarmCategory, ThinkingLevel, type SafetySetting } from "@google/genai";

// Every AI call in Dime goes through `ask`. Gemini answers first; Groq is
// the backup if Gemini errors, is rate limited or returns nothing usable.
// (Tested side by side on real messages: Gemini's jokes land, Groq's free
// models were blander and hit their per-minute token limit quickly.)
//
//   "fast"    – reading "coffee 5", quips, roasts: the latest Flash-Lite,
//               no thinking (about a second).
//   "serious" – money advice and reads of your month: the latest Flash,
//               with a little thinking.
//
// Models are named by Google's "-latest" aliases, which Google moves to each
// new release, so a better free model shows up here without a code change.
// Answers are constrained to a JSON schema, so a reply is either well-formed
// or it falls through to the other provider.

export type Schema = Record<string, unknown>;

type AskOptions = {
  /** The stable instructions. Sent as a system message (cached by Groq). */
  system: string;
  /** The per-request part: the user's message, today's date, their numbers. */
  prompt: string;
  /** The JSON shape of the answer. */
  schema: Schema;
  kind?: "fast" | "serious";
  /** Relaxed safety settings for reading purchases ("Uber at 2am" isn't harmful). */
  lenient?: boolean;
  /** Creativity. Quips like it warm, numbers like it cool. */
  temperature?: number;
  /** How hard Groq's model thinks first. Defaults: low for fast, medium for serious. */
  effort?: "low" | "medium" | "high";
  /** Told which provider answered, for the Server-Timing header. */
  onProvider?: (p: "groq" | "gemini") => void;
};

const GEMINI = { fast: ["gemini-flash-lite-latest", "gemini-flash-latest"], serious: ["gemini-flash-latest", "gemini-flash-lite-latest"] };
const GROQ_MODEL = "openai/gpt-oss-120b";
const RETRY_DELAYS = [1200, 3000];

const LENIENT: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const statusOf = (e: unknown) => (e as { status?: number; code?: number })?.status ?? (e as { code?: number })?.code;

export async function ask<T = unknown>(opts: AskOptions): Promise<T> {
  const groq = process.env.GROQ_API_KEY ? () => askGroq(opts) : null;
  const gemini = process.env.GEMINI_API_KEY ? () => askGemini(opts) : null;
  const order = [["gemini", gemini], ["groq", groq]] as [
    "groq" | "gemini",
    (() => Promise<string>) | null,
  ][];

  let lastError: unknown = new Error("No AI provider is configured");
  for (const [name, run] of order) {
    if (!run) continue;
    try {
      const value = parseJson(await run()) as T;
      opts.onProvider?.(name);
      return value;
    } catch (e) {
      lastError = e;
      console.warn(`${name} failed:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastError;
}

async function askGroq({ system, prompt, schema, temperature = 0.8, kind = "fast", effort }: AskOptions): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature,
      max_completion_tokens: 1500,
      reasoning_effort: effort ?? (kind === "fast" ? "low" : "medium"),
      include_reasoning: false,
      // Strict mode: the answer is guaranteed to match the schema.
      response_format: { type: "json_schema", json_schema: { name: "answer", strict: true, schema } },
    }),
    // If Groq is slow today, don't make you wait.
    signal: AbortSignal.timeout(kind === "fast" ? 6000 : 15000),
  });
  if (!res.ok) throw Object.assign(new Error(`Groq ${res.status}`), { status: res.status });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned nothing");
  return text;
}

async function askGemini({ system, prompt, schema, temperature = 0.8, kind = "fast", lenient }: AskOptions): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const models = [...GEMINI[kind]];
  if (process.env.GEMINI_MODEL) models.unshift(process.env.GEMINI_MODEL);

  // Fast questions skip thinking; serious ones think a little. If a model
  // rejects the setting (or the schema), drop it and ask again.
  let thinking: ThinkingLevel | null = kind === "fast" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;
  let useSchema = true;
  let lastError: unknown;
  for (let attempt = 0, m = 0; attempt <= RETRY_DELAYS.length && m < models.length; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: models[m],
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: "application/json",
          ...(useSchema ? { responseJsonSchema: schema } : {}),
          ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
          ...(lenient ? { safetySettings: LENIENT } : {}),
          // A stuck call falls through to Groq instead of hanging the request.
          abortSignal: AbortSignal.timeout(kind === "fast" ? 8000 : 25000),
        },
      });
      const text = (res.text ?? "").trim();
      if (!text) throw new Error("Gemini returned nothing");
      return text;
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      if (status === 400 && (thinking || useSchema)) {
        if (thinking) thinking = null;
        else useSchema = false;
        attempt--;
        continue;
      }
      if (status === 404) {
        m++; // that model's gone: try the next one, no waiting
        attempt--;
        continue;
      }
      // Busy? With Groq as backup, hand over now rather than wait and retry.
      if ((status === 429 || status === 503) && attempt < RETRY_DELAYS.length && !process.env.GROQ_API_KEY) {
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
    .replace(/₹\s?/g, "$")
    .trim();
}

// Small helpers for writing schemas compactly. Strict mode wants every
// property required and no extras; "nullable" is how a field is optional.
export const S = {
  str: { type: "string" },
  num: { type: "number" },
  int: { type: "integer" },
  bool: { type: "boolean" },
  enum: (values: readonly string[]) => ({ type: "string", enum: values }),
  nullable: (t: { type: string } & Record<string, unknown>) => ({ ...t, type: [t.type, "null"] }),
  arr: (items: Schema) => ({ type: "array", items }),
  obj: (properties: Record<string, Schema>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false }),
};
