"use client";

// When a page crashes: Tom owns up and offers a retry, instead of a blank screen.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-oat px-6 text-center">
      <p className="text-[13px] font-semibold text-ink-2">Tom the lizard</p>
      <h1 className="max-w-[420px] text-[24px] font-semibold tracking-[-0.02em] text-ink">Something broke on my side. Your money&apos;s fine, I just tripped.</h1>
      <button onClick={reset} className="h-10 rounded-[10px] bg-ink px-5 text-[14px] font-semibold text-paper transition-transform active:scale-95">
        Try again
      </button>
    </main>
  );
}
