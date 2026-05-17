import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy-init: Cloudflare Workers may not have process.env populated at
// module evaluation time, so we defer Redis/Ratelimit creation to first use.
let _standard: Ratelimit | null = null;
let _strict: Ratelimit | null = null;

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function getStandardLimit(): Ratelimit {
  if (!_standard) {
    _standard = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "dime:rl:standard",
    });
  }
  return _standard;
}

function getStrictLimit(): Ratelimit {
  if (!_strict) {
    _strict = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "dime:rl:strict",
    });
  }
  return _strict;
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

export async function checkRateLimit(
  ip: string,
  variant: "standard" | "strict" = "standard"
): Promise<RateLimitResult> {
  const limiter = variant === "strict" ? getStrictLimit() : getStandardLimit();
  const { success, reset } = await limiter.limit(ip);

  return {
    allowed: success,
    retryAfter: success
      ? undefined
      : Math.ceil((reset - Date.now()) / 1000),
  };
}

export function getRequestIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "127.0.0.1";
}
