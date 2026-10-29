import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-error";
import { sameSecret } from "@/lib/tokens";
import { bearer, guardRequest, logMessage, readBody, userForToken } from "@/lib/ingest";

// The older Quick Add endpoint, kept so existing shortcuts keep working. It now
// runs the same guarded pipeline as /api/ingest and accepts personal tokens.
// The legacy shared QUICK_ADD_TOKEN still works while it's set; unset it to
// turn that path off.

export async function POST(request: NextRequest) {
  try {
    const blocked = await guardRequest(request);
    if (blocked) return blocked;

    const token = bearer(request);
    let who = await userForToken(token);
    const legacy = process.env.QUICK_ADD_TOKEN;
    const legacyUser = process.env.QUICK_ADD_USER_ID;
    if (!who && legacy && legacyUser && token.length >= 16 && (await sameSecret(token, legacy))) {
      who = { userId: legacyUser, bucket: "legacy-quick-add" };
    }
    if (!who) return apiError("Missing or invalid token", "UNAUTHORIZED", 401);

    const body = await readBody(request);
    if (!body) return apiError("That message is too long", "VALIDATION_FAILED", 413);
    return await logMessage(who.userId, who.bucket, body.success ? { ...body, data: { ...body.data, source: body.data.source === "api" ? "shortcut" : body.data.source } } : body);
  } catch {
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
