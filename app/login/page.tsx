"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { emailForName } from "@/lib/callsign";
import { Bubble, TypingBubble } from "@/components/dime/bubble";
import { Wordmark } from "@/components/ui/wordmark";
import { CoinToggle } from "@/components/ui/coin-toggle";

type Step = "hello" | "name" | "secret" | "invite" | "busy" | "done";
type Msg = { id: number; from: "tejal" | "you"; text: string; tone?: "lego" };

const TAKEN = [
  (n: string) => `Bro, ${n} is already famous here. Try another one?`,
  (n: string) => `Arey, ${n} pehle se hai. Kuch aur soch.`,
  (n: string) => `My database only has budget for one ${n}. ${n}_pro_max?`,
];

function hello(hour: number) {
  if (hour < 0) return "yooo what's good";
  if (hour < 5) return `yo it's like ${hour === 0 ? 12 : hour}am. what are we doing up 💀`;
  if (hour < 12) return "gm gm. coffee first or receipts first?";
  if (hour < 17) return "yooo whatsuppp";
  if (hour < 22) return "heyyy, evening check-in?";
  return "late night spending era? no judgment. (some judgment)";
}

// 6-7. If you know, you know.
const sixSeven = (s: string) => /^\s*6\s*[-–]?\s*7\s*$|six\s*seven/i.test(s);

const noop = () => () => {};
let seq = 100;

/**
 * Signing in is a conversation with me (Tejal). I ask, you answer in the
 * reply box, and the answers are the form. Name and secret only.
 */
export default function LoginPage() {
  const router = useRouter();
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => -1);
  const [mode, setMode] = useState<"in" | "new">("in");
  const [step, setStep] = useState<Step>("hello");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [invite, setInvite] = useState("");
  const [show, setShow] = useState(false);
  const [typing, setTyping] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const handle = name.trim();

  // iMessage-style: when something new lands, the whole thread slides up
  // together. Jump to the bottom, then start the thread offset by however much
  // it grew and spring it back to 0. One transform, so nothing can overlap.
  const list = useRef<HTMLDivElement>(null);
  const lastHeight = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = list.current;
    const box = scroller.current;
    if (!el || !box) return;
    const height = el.offsetHeight;
    const grew = lastHeight.current === null ? 0 : height - lastHeight.current;
    lastHeight.current = height;
    box.scrollTop = box.scrollHeight;
    if (!grew) return;
    const now = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
    animate(el, { y: [now + grew, 0] }, { type: "spring", stiffness: 380, damping: 36 });
  }, [msgs.length, typing]);

  // Put the cursor in whichever box is showing.
  useEffect(() => {
    if (step === "name" || step === "secret" || step === "invite") field.current?.focus();
  }, [step]);

  const you = (text: string) => setMsgs((m) => [...m, { id: seq++, from: "you", text }]);
  // I "type" for a beat before each reply, like a person would.
  function say(lines: string[], next?: Step, tone?: "lego") {
    setTyping(true);
    lines.forEach((text, i) => {
      setTimeout(() => {
        setMsgs((m) => [...m, { id: seq++, from: "tejal", text, tone }]);
        if (i === lines.length - 1) {
          setTyping(false);
          if (next) setStep(next);
        }
      }, 520 + i * 640);
    });
  }

  function choose(m: "in" | "new") {
    setMode(m);
    setStep("busy");
    you(m === "in" ? "Yep, sign me in" : "Nope, I'm new here");
    say(
      m === "in"
        ? ["ayyy welcome back. who dis?"]
        : ["ooh, fresh face 👀", "who dis? just a name. no email, no phone, no drama."],
      "name"
    );
  }

  function submitName() {
    if (!handle) return;
    you(handle);
    setStep("busy");
    const vibe = sixSeven(handle)
      ? ["SIX SEVENNN 🤷 okay you're funny."]
      : mode === "in"
        ? [`${handle}! the legend returns.`]
        : [`${handle}. love that for you.`];
    say(
      mode === "in"
        ? [...vibe, "now the secret. i'm not looking 🙈"]
        : [...vibe, "pick a secret, 6+ characters. fr tho, if you forget it i genuinely can't help. everything has its settlements."],
      "secret"
    );
  }

  function submitSecret() {
    if (secret.length < 6) {
      say(["bit short, no? 6 characters at least."], "secret");
      return;
    }
    you("•".repeat(Math.min(secret.length, 12)));
    if (mode === "new") {
      setStep("busy");
      say(["last thing: the invite code.", "don't have one? Ask a friend (me :D)"], "invite");
    } else go();
  }

  function submitInvite() {
    if (!invite.trim()) return;
    you(invite.trim());
    go();
  }

  async function go() {
    setStep("busy");
    setTyping(true);
    const supabase = createClient();
    const email = emailForName(handle);
    const fail = (text: string, back: Step) => {
      setTyping(false);
      say([text], back, "lego");
    };
    try {
      if (mode === "new") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: handle, secret, code: invite.trim() }),
        });
        if (!res.ok) {
          if (res.status === 409) {
            setName("");
            return fail(TAKEN[Math.floor(Math.random() * TAKEN.length)](handle), "name");
          }
          if (res.status === 400) {
            setName("");
            return fail("keep the name simple: letters, numbers, spaces, dots or dashes.", "name");
          }
          return fail(
            res.status === 429
              ? "ok that's a lot of tries. give it a few minutes?"
              : res.status === 403
                ? "hmm, that code isn't one of mine. ask me for the right one :)"
                : "something broke on my side. try again in a bit?",
            "invite"
          );
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password: secret });
        if (error) return fail(/fetch|network/i.test(error.message) ? "I can't reach my notebook rn. wifi okay?" : error.message, "secret");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: secret });
        if (error) {
          setSecret("");
          return fail(
            /invalid login/i.test(error.message)
              ? "hmm, that's not it chief. try the secret again?"
              : /fetch|network/i.test(error.message)
                ? "I can't reach my notebook rn. wifi okay?"
                : error.message,
            "secret"
          );
        }
      }
      setTyping(false);
      say([mode === "in" ? "you're in. let's see the damage :D" : `yoink, you're in. welcome to Dime, ${handle}.`], "done");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1700);
    } catch {
      fail("I can't reach my notebook rn. wifi okay?", mode === "new" ? "invite" : "secret");
    }
  }

  function back() {
    setStep("busy");
    setSecret("");
    you("wait, wrong name");
    say(["no stress. what's the name?"], "name");
  }

  const thread: Msg[] = [
    { id: 1, from: "tejal", text: hello(hour) },
    { id: 2, from: "tejal", text: "I'm Tejal, I made Dime. you tell it what you spent, it sorts it into Life and Lego, then roasts you a lil." },
    { id: 3, from: "tejal", text: "so, have we met before?" },
    ...msgs,
  ];

  const box =
    "h-12 min-w-0 flex-1 rounded-[10px] bg-oat px-4 text-[16px] font-medium text-ink outline-none ring-2 ring-transparent transition-shadow placeholder:text-ink-3 focus:ring-ink";

  return (
    <main className="flex min-h-dvh flex-col bg-oat">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-10 py-6">
        <Wordmark />
        <CoinToggle />
      </header>

      <section className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-12 items-center gap-10 px-10 pb-10">
        <div className="col-span-12 lg:col-span-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-[54px] font-semibold leading-[1.04] tracking-[-0.035em]"
          >
            Every cent has a story.
            <br />
            <span className="text-ink-3">Usually a bad one.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-[460px] text-[18px] leading-relaxed text-ink-2"
          >
            Text it what you spent, like you&apos;d text a friend. It sorts everything into{" "}
            <span className="font-semibold text-life">Life</span> (you needed it) and <span className="font-semibold text-lego">Lego</span> (you
            wanted it), keeps the receipt, and tells you the truth.
          </motion.p>
          <SampleReceipt />
        </div>

        {/* The conversation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 flex h-[600px] flex-col overflow-hidden rounded-[14px] bg-paper shadow-paper lg:col-span-5 lg:col-start-8"
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-paper">
              T
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-paper bg-life" />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold">Tejal</p>
              <p className="text-[13px] text-ink-3">{typing ? "typing…" : "made Dime · usually replies instantly"}</p>
            </div>
          </div>

          <div ref={scroller} className="scrollbar-none flex flex-1 flex-col overflow-y-auto px-5 py-5">
            <div className="mt-auto" />
            <div ref={list} className="flex flex-col gap-2">
              {thread.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: m.id < 4 ? 10 : 0, scale: m.id < 4 ? 1 : 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  style={{ transformOrigin: m.from === "you" ? "100% 100%" : "0% 100%" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34, delay: m.id < 4 ? 0.35 + i * 0.45 : 0 }}
                >
                  <Bubble
                    text={m.text}
                    from={m.from === "you" ? "you" : "dime"}
                    tone={m.tone}
                    instant
                    still
                    className={m.from === "tejal" && !m.tone ? "!bg-oat !shadow-none" : "!shadow-none"}
                  />
                </motion.div>
              ))}
              {typing && <TypingBubble className="bg-oat" />}
            </div>
          </div>

          {/* The reply box changes with the question */}
          <form
            className="border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === "name") submitName();
              else if (step === "secret") submitSecret();
              else if (step === "invite") submitInvite();
            }}
          >
            {/* Kept in the form so password managers can pair name and secret. */}
            {step !== "name" && (
              <input aria-hidden tabIndex={-1} readOnly value={name} autoComplete="username" className="pointer-events-none absolute h-0 w-0 opacity-0" />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step === "busy" ? "busy" : step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2"
              >
                {step === "hello" && (
                  <motion.div
                    className="flex w-full gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                  >
                    <button type="button" onClick={() => choose("in")} className="h-12 flex-1 rounded-[10px] bg-ink text-[15px] font-semibold text-paper transition-transform active:scale-[0.98]">
                      Yep, sign me in
                    </button>
                    <button type="button" onClick={() => choose("new")} className="h-12 flex-1 rounded-[10px] bg-oat text-[15px] font-semibold text-ink transition-transform hover:bg-panel active:scale-[0.98]">
                      Nope, I&apos;m new
                    </button>
                  </motion.div>
                )}
                {step === "name" && (
                  <>
                    <input
                      ref={field}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={40}
                      placeholder="Your name"
                      className={box}
                    />
                    <Send disabled={!handle} />
                  </>
                )}
                {step === "secret" && (
                  <>
                    <span className="relative flex min-w-0 flex-1">
                      <input
                        ref={field}
                        type={show ? "text" : "password"}
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        autoComplete={mode === "in" ? "current-password" : "new-password"}
                        placeholder="Your secret"
                        className={`${box} pr-16`}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShow((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-ink-2 hover:bg-panel hover:text-ink"
                      >
                        {show ? "hide" : "show"}
                      </button>
                    </span>
                    <Send disabled={!secret} />
                  </>
                )}
                {step === "invite" && (
                  <>
                    <input
                      ref={field}
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="Invite code (ask a friend, me :D)"
                      className={box}
                    />
                    <Send disabled={!invite.trim()} />
                  </>
                )}
                {(step === "busy" || step === "done") && <div className="h-12 w-full rounded-[10px] bg-oat" />}
              </motion.div>
            </AnimatePresence>
            {step === "secret" && mode === "in" && (
              <button type="button" onClick={back} className="mt-2 px-1 text-[13px] font-medium text-ink-3 hover:text-ink">
                Not {handle}? Change name
              </button>
            )}
          </form>
        </motion.div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-10 pb-6 text-[13px] text-ink-3">
        <span>No email. No phone. Just a name and a secret.</span>
        <span className="flex gap-5">
          <a href="https://github.com/tejalgoyal2/Dime" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
          <a href="https://tgoyal.me" target="_blank" rel="noopener noreferrer" className="hover:text-ink">tgoyal.me</a>
        </span>
      </footer>
    </main>
  );
}

function Send({ disabled }: { disabled: boolean }) {
  return (
    <motion.button
      type="submit"
      aria-label="Send"
      disabled={disabled}
      animate={{ scale: disabled ? 0.9 : 1, opacity: disabled ? 0.35 : 1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-ink text-paper"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </motion.button>
  );
}

const SAMPLE = [
  { name: "Coffee & croissant", amt: "7.25", lego: true },
  { name: "Groceries", amt: "84.20", lego: false },
  { name: "Uber home", amt: "23.40", lego: true },
  { name: "Phone bill", amt: "45.00", lego: false },
];

// What a day in Dime looks like, printed.
function SampleReceipt() {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 16, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: -2 }}
      transition={{ type: "spring", stiffness: 110, damping: 18, delay: 0.35 }}
      className="mt-10 hidden w-[300px] [filter:drop-shadow(0_10px_18px_rgba(20,20,24,.14))] lg:block"
    >
      <div className="torn bg-paper px-5 pb-8 pt-5" style={{ borderRadius: "10px 10px 0 0" }}>
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-3">Today</p>
        <ul className="mt-3 space-y-2 text-[14px]">
          {SAMPLE.map((s, i) => (
            <motion.li key={s.name} className="flex items-baseline" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.3 }}>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${s.lego ? "bg-lego" : "bg-life"}`} />
              <span className="font-medium">{s.name}</span>
              <span className="leader" />
              <span className="font-semibold">{s.amt}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-4 border-t border-dashed border-line-strong pt-3 text-[13px] text-ink-2">
          &ldquo;Croissant for $7? Bhai, Paris mein ho kya?&rdquo;
        </div>
        <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">No refunds</p>
      </div>
    </motion.div>
  );
}
