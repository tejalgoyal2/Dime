const RETRY_DELAYS = [2000, 4000, 8000];

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      const retryable = status === 429 || status === 503;

      if (retryable && attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS[attempt])
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
