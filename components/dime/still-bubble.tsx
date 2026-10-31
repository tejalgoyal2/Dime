import { ScrambleText } from "@/components/ui/scramble";

/**
 * Bubbles with no motion library behind them, for the login thread: the
 * thread moves as one block and each bubble's entrance is plain CSS, so the
 * login page doesn't have to ship framer-motion. Same look as Bubble.
 */
export function bubbleClass(from: "dime" | "you", tone: "plain" | "lego" = "plain") {
  const you = from === "you";
  const color = you ? "bg-ink text-paper" : tone === "lego" ? "bg-lego text-white" : "bg-paper text-ink";
  return `relative w-fit max-w-full px-4 py-3 shadow-paper ${you ? "ml-auto !rounded-tr-[4px]" : "!rounded-tl-[4px]"} ${color}`;
}

export function StillBubble({
  text,
  from = "dime",
  tone = "plain",
  className = "",
}: {
  text: string;
  from?: "dime" | "you";
  tone?: "plain" | "lego";
  className?: string;
}) {
  return (
    <div style={{ borderRadius: 14 }} className={`${bubbleClass(from, tone)} ${className}`}>
      <p className="text-[16px] font-medium leading-snug">
        <ScrambleText text={text} />
      </p>
    </div>
  );
}

export function Dots() {
  return (
    <span className="flex items-center gap-[5px]">
      <i className="typing-dot" />
      <i className="typing-dot" />
      <i className="typing-dot" />
    </span>
  );
}

/** TypingBubble's pop-in, done in CSS (`.typing-pop`). */
export function StillTypingBubble({ className = "bg-paper" }: { className?: string }) {
  return (
    <div
      style={{ transformOrigin: "0% 100%" }}
      role="status"
      aria-label="Typing"
      className={`typing-bubble typing-pop w-fit rounded-[16px] rounded-tl-[4px] px-4 py-3.5 ${className}`}
    >
      <Dots />
    </div>
  );
}

/** Me, as a gecko. A 4 KB WebP, already round. */
export function TejalFace({ size = 40, dot = "border-paper" }: { size?: number; dot?: string }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- one tiny static image */}
      <img src="/tejal.webp" alt="Tejal" width={size} height={size} className="h-full w-full rounded-full" draggable={false} />
      <span
        className={`absolute -bottom-px -right-px rounded-full bg-life ${dot}`}
        style={{ width: Math.max(8, size * 0.32), height: Math.max(8, size * 0.32), borderWidth: size > 30 ? 2.5 : 1.5 }}
      />
    </span>
  );
}
