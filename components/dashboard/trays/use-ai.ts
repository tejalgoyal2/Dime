"use client";

import { useCallback, useState } from "react";

// Fire an AI endpoint once per open; keeps loading/error/data together.
export function useAi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const run = useCallback(
    async (body: unknown) => {
      setLoading(true);
      setError(false);
      setData(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        setData((await res.json()) as T);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  return { data, loading, error, run };
}
