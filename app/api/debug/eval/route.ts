import { NextRequest, NextResponse } from "next/server";
import { ask, type Schema } from "@/lib/ai";
import { sameSecret } from "@/lib/tokens";
import { PARSE_SCHEMA, PARSE_SYSTEM } from "@/lib/parse-prompt";
import { INGEST_SCHEMA, INGEST_SYSTEM } from "@/lib/ingest";

// TEMPORARY: prompt evaluation against the real models. Off unless the
// EVAL_TOKEN secret is set; removed right after testing.
export async function POST(request: NextRequest) {
  const secret = process.env.EVAL_TOKEN;
  const token = request.headers.get("x-eval-token") ?? "";
  if (!secret || token.length < 32 || !(await sameSecret(token, secret))) return new NextResponse(null, { status: 404 });
  const b = (await request.json()) as { preset?: "parse" | "ingest"; system?: string; schema?: Schema; prompt: string; kind?: "fast" | "serious"; temperature?: number; effort?: "low" | "medium" | "high"; only?: "groq" | "gemini"; model?: string };
  const system = b.preset === "parse" ? PARSE_SYSTEM : b.preset === "ingest" ? INGEST_SYSTEM : b.system!;
  const schema = b.preset === "parse" ? PARSE_SCHEMA : b.preset === "ingest" ? INGEST_SCHEMA : b.schema!;
  const t = Date.now();
  let provider = "";
  try {
    // `only` hides the other provider's key for this call, to compare them.
    const hide = b.only === "groq" ? "GEMINI_API_KEY" : b.only === "gemini" ? "GROQ_API_KEY" : null;
    const saved = hide ? process.env[hide] : undefined;
    if (hide) delete process.env[hide];
    if (b.model) process.env.GEMINI_MODEL = b.model;
    const out = await ask({ system, schema, prompt: b.prompt, kind: b.kind, temperature: b.temperature, effort: b.effort, lenient: true, onProvider: (p) => (provider = p) }).finally(() => {
      if (hide) process.env[hide] = saved;
      delete process.env.GEMINI_MODEL;
    });
    return NextResponse.json({ provider, ms: Date.now() - t, out });
  } catch (e) {
    return NextResponse.json({ provider, ms: Date.now() - t, error: String(e) }, { status: 500 });
  }
}
