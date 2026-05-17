const ALLOWED_ORIGINS = [
  "https://wallet.tgoyal.me",
  "http://localhost:3000",
];

export function isValidOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // Same-origin requests don't send Origin
  return ALLOWED_ORIGINS.includes(origin);
}
