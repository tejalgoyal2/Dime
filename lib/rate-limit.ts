import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const standardLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "dime:rl:standard",
});

const strictLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "dime:rl:strict",
});

export type RateLimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

export async function checkRateLimit(
  ip: string,
  variant: "standard" | "strict" = "standard"
): Promise<RateLimitResult> {
  const limiter = variant === "strict" ? strictLimit : standardLimit;
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
