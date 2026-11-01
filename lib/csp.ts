// The Content Security Policy. Pages get a fresh random nonce per request
// (set in middleware): only scripts carrying it, our own files, and
// Cloudflare's analytics beacon may run, so an injected <script> can't.
// Styles stay inline-friendly: the animations set style attributes.

export function contentSecurityPolicy(nonce: string) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://cloudflareinsights.com ${supabase} ${supabase.replace(/^https/, "wss")}`.trim(),
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export const newNonce = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))));
