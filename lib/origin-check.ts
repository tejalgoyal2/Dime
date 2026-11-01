const ALLOWED_ORIGINS = ["https://dime.tgoyal.me", ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:3456"] : [])];

/**
 * Cross-site request forgery guard for cookie-authenticated writes. Browsers
 * mark every request with where it came from (Sec-Fetch-Site) and send an
 * Origin on POSTs; anything from another site is refused.
 */
export function isValidOrigin(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin GETs and non-browser clients don't send one
  return ALLOWED_ORIGINS.includes(origin);
}
