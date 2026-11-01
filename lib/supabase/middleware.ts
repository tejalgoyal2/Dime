import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, newNonce } from "@/lib/csp";

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/api/quick-add",
  "/api/signup",
  "/api/ingest", // token-authenticated
];

// Token-authenticated endpoints skip the session lookup entirely.
const TOKEN_PATHS = ["/api/ingest", "/api/quick-add", "/api/debug/eval"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (TOKEN_PATHS.includes(path)) return NextResponse.next();

  // API routes verify the session themselves (every one calls getUser), so
  // skip the extra round trip to Supabase here: just turn away requests that
  // don't even carry a session cookie.
  if (path.startsWith("/api/")) {
    const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    if (!isPublic && !request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Pages: a fresh CSP nonce, handed to Next (which stamps it on its own
  // scripts) through the request headers, and enforced on the response.
  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce);
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("content-security-policy", csp);
    return res;
  };

  let supabaseResponse = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = next();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
