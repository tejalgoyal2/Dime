import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-error";
import { bearer, guardRequest, logMessage, readBody, userForToken } from "@/lib/ingest";

/**
 * Log an expense from anywhere: a phone automation forwarding bank texts, an
 * Apple Shortcut, Raycast, curl. Authenticate with a personal token made in
 * Dime (Menu → Auto-log).
 *
 *   POST /api/ingest
 *   Authorization: Bearer dime_…
 *   { "text": "coffee & croissant 7" }                       // a note
 *   { "text": "Your card was charged $12.50 at STARBUCKS", "source": "sms" }  // a bank alert
 *
 * A plain-text body works too. Only purchases are logged; OTPs, refunds,
 * deposits and declines are ignored. Forwarded alerts are de-duplicated.
 *
 * Limits: 30 requests/min per IP, 12/min per token, 300 AI reads per person per day.
 */
export async function POST(request: NextRequest) {
  try {
    const blocked = await guardRequest(request);
    if (blocked) return blocked;

    const who = await userForToken(bearer(request));
    if (!who) return apiError("Missing or invalid token", "UNAUTHORIZED", 401);

    const body = await readBody(request);
    if (!body) return apiError("That message is too long", "VALIDATION_FAILED", 413);
    return await logMessage(who.userId, who.bucket, body);
  } catch {
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
