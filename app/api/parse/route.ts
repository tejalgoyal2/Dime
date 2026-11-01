import { NextRequest } from "next/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { aiFailure, logWithAi } from "@/lib/log-expense";

// What you typed ("coffee 5") into expenses and Tom's reply. ?save=1 also
// saves them in the same request. The pipeline is in lib/log-expense.ts.
export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    const text = (await request.text()).trim();
    if (!text || text.length > 2000) return apiError("Provide expense text (max 2000 chars)", "VALIDATION_FAILED", 400);
    return await logWithAi(request, { text }, request.nextUrl.searchParams.get("save") === "1");
  } catch (error) {
    return aiFailure(error);
  }
}
