import { NextRequest } from "next/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { aiFailure, logWithAi } from "@/lib/log-expense";

// A photo of a receipt into an expense (store, total, date) and Tom's reply,
// saved in the same request. The browser shrinks the photo first (about
// 1600px, JPEG), so a few hundred KB arrives here; anything over 4 MB is
// refused before it's read.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return apiError("That photo is too big", "VALIDATION_FAILED", 413);
    const mimeType = request.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!TYPES.includes(mimeType)) return apiError("Send a JPEG, PNG or WebP photo", "VALIDATION_FAILED", 415);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return apiError("That photo is too big", "VALIDATION_FAILED", 413);
    if (!looksLike(bytes, mimeType)) return apiError("That doesn't look like a photo", "VALIDATION_FAILED", 415);
    return await logWithAi(request, { image: { data: toBase64(bytes), mimeType } }, true);
  } catch (error) {
    return aiFailure(error);
  }
}

/** The file really is the image type it claims (its first bytes say so). */
function looksLike(b: Uint8Array, type: string) {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  return String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP";
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
