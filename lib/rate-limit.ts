import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy-init: Cloudflare Workers may not have process.env populated at
// module evaluation time, so we defer Redis/Ratelimit creation to first use.
let _redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// Every bucket Dime rate-limits on, in one place.
const POLICIES = {
  // Signed-in app requests, per IP.
  standard: { limit: 20, window: "1 m", kind: "sliding" },
  // Invite-code guesses, per IP.
  strict: { limit: 5, window: "15 m", kind: "sliding" },
  // Anything hitting the public logging API, per IP, checked before any other work.
  "api-ip": { limit: 30, window: "1 m", kind: "sliding" },
  // One logging token, however many IPs it's used from.
  "api-token": { limit: 12, window: "1 m", kind: "sliding" },
  // AI calls per person per day, across the app and the API. Caps the Gemini bill.
  "ai-day": { limit: 300, window: "1 d", kind: "fixed" },
} as const satisfies Record<string, { limit: number; window: Duration; kind: "sliding" | "fixed" }>;

export type LimitName = keyof typeof POLICIES;

function getLimiter(name: LimitName): Ratelimit {
  let l = limiters.get(name);
  if (!l) {
    const p = POLICIES[name];
    l = new Ratelimit({
      redis: getRedis(),
      limiter: p.kind === "fixed" ? Ratelimit.fixedWindow(p.limit, p.window) : Ratelimit.slidingWindow(p.limit, p.window),
      prefix: `dime:rl:${name}`,
    });
    limiters.set(name, l);
  }
  return l;
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

export async function checkRateLimit(key: string, variant: LimitName = "standard"): Promise<RateLimitResult> {
  const { success, reset } = await getLimiter(variant).limit(key);
  return {
    allowed: success,
    retryAfter: success ? undefined : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}

/** The daily AI budget for one person. */
export const checkAiBudget = (userId: string) => checkRateLimit(`user:${userId}`, "ai-day");

// Behind Cloudflare, cf-connecting-ip is set by Cloudflare itself and can't be
// forged by the client; x-forwarded-for can, so it's only a local fallback.
export function getRequestIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "127.0.0.1";
}
