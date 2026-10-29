/**
 * The Hinglish lines come with an English version. This little toggle swaps
 * between them. It sits quietly until you hover the message, then nudges.
 * Plain CSS (no motion library), so it's free on the login page too.
 */
export function TranslateToggle({ on, onChange, className = "" }: { on: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      title={on ? "Back to Hinglish" : "Not fluent in Hinglish? Translate"}
      className={`translate-toggle inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-ink-3 transition-colors duration-200 hover:bg-oat hover:text-ink ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
      </svg>
      <span key={String(on)} className="word-roll">
        {on ? "Original" : "Translate"}
      </span>
    </button>
  );
}
