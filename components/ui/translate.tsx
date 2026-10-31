/**
 * The Hinglish lines come with English and Chinese versions. This chip steps
 * through them: Translate → 中文 → Original. It sits quietly until you hover
 * the message, then nudges. Plain CSS (no motion library), so it's free on
 * the login page too.
 */
export type Lang = "orig" | "en" | "zh";

export const nextLang = (l: Lang, hasZh = true): Lang => (l === "orig" ? "en" : l === "en" && hasZh ? "zh" : "orig");

const LABEL: Record<Lang, string> = { orig: "Translate", en: "中文", zh: "Original" };
const TITLE: Record<Lang, string> = { orig: "Not fluent in Hinglish? See it in English", en: "看中文", zh: "Back to Hinglish" };

export function TranslateToggle({ lang, onChange, hasZh = true, className = "" }: { lang: Lang; onChange: (l: Lang) => void; hasZh?: boolean; className?: string }) {
  const label = lang === "en" && !hasZh ? "Original" : LABEL[lang];
  return (
    <button
      type="button"
      onClick={() => onChange(nextLang(lang, hasZh))}
      aria-pressed={lang !== "orig"}
      title={TITLE[lang]}
      className={`translate-toggle inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-ink-3 transition-colors duration-200 hover:bg-oat hover:text-ink ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
      </svg>
      <span key={label} className="word-roll">
        {label}
      </span>
    </button>
  );
}

/** Pick the text for a language, falling back to the original. */
export const inLang = (lang: Lang, orig: string, en?: string | null, zh?: string | null) => (lang === "zh" && zh ? zh : lang === "en" && en ? en : orig);
