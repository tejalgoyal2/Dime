"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { LegoBrick, LifeCoin } from "@/components/ui/life-lego-icons";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT, LEAVE_QUICK } from "@/lib/motion";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Bubble, Speaker, TypingBubble } from "@/components/dime/bubble";
import { CashBill, CashFly } from "@/components/ui/cash-bill";
import { inLang, TranslateToggle, type Lang } from "@/components/ui/translate";
import { BIG_SPEND, isSixSeven, pickAmount } from "@/lib/amounts";
import { Money, money } from "@/components/ui/money";
import { LOCAL_DATE_HEADER, localISODate } from "@/lib/dates";
import { monthSummary, punchStats, safeToSpend } from "@/lib/stats";
import { useBudget, usePunchGoal } from "@/lib/use-budget";
import type { ExpenseRow } from "@/lib/supabase/types";
import type { ParsedExpense } from "@/lib/schemas/expense";
import { TypeCoin } from "./cells/type-coin";
import { shrinkPhoto } from "@/lib/photo";
import { PriceFix } from "./price-fix";

const PLACEHOLDERS = ["coffee & croissant 7", "uber home 18", "groceries at freshco 84", "netflix 16.99", "2am pizza 22, again", "gym 50", "bubble tea 8"];

const noop = () => () => {};
const subscribeCoarse = (cb: () => void) => {
  const m = matchMedia("(pointer: coarse)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

// `fresh` is true until you start typing again: the entrance effects (words
// fading in, the bill popping) play once, and coming back to the reply after
// clearing the box just shows it again quietly.
type Reply = { you: string; photo?: string; items: ExpenseRow[]; text: string; en?: string; zh?: string; tone?: "lego"; egg?: boolean; fresh: boolean } | null;

function greeting(hour: number, name: string) {
  if (hour < 0) return `Hey ${name}! What did we buy?`;
  if (hour < 5) return `${name}, it's like ${hour === 0 ? 12 : hour}am. What are we buying at this hour? :D`;
  if (hour < 12) return `Morning, ${name}! Coffee already?`;
  if (hour < 17) return `Hey ${name}. Lunch damage?`;
  if (hour < 22) return `Evening, ${name}. So, what did we buy today?`;
  return `Still up, ${name}? Spill.`;
}

/**
 * The counter: Dime, what he's saying, and the one place you tell him what
 * you spent. To the right, how the month is going.
 */
export function Counter({ callsign, arranging, onLogged }: { callsign: string; arranging: boolean; onLogged: (ids: string[]) => void }) {
  const { state, addExpenses, updateExpense, deleteExpense } = useExpenses();
  const { toast } = useToast();
  const [budget, setBudget] = useBudget();
  const [goal] = usePunchGoal();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply>(null);
  const [focused, setFocused] = useState(false);
  const [ph, setPh] = useState(0);
  const [pasted, setPasted] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  // Which language my Hinglish reply is showing in.
  const [lang, setLang] = useState<Lang>("orig");
  // Something big logged: its bill hops into the month total.
  const [rain, setRain] = useState(0);
  const [flyAmount, setFlyAmount] = useState(0);
  // A receipt photo on its way: shown as your message while Tom reads it.
  const [pending, setPending] = useState<{ you: string; photo?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRain = useCallback(() => setRain(0), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => -1);
  // Dates come from your browser, never the server: the server runs on UTC,
  // which is already tomorrow (or next month) on a Vancouver evening, and a
  // page that disagrees with itself has to be thrown away and redrawn.
  const month = useSyncExternalStore(noop, () => format(new Date(), "MMMM"), () => null);
  // Touch screens drag cards with a press and hold.
  const touch = useSyncExternalStore(subscribeCoarse, () => matchMedia("(pointer: coarse)").matches, () => false);
  const name = callsign.charAt(0).toUpperCase() + callsign.slice(1);

  useEffect(() => {
    const t = setInterval(() => setPh((i) => (i + 1) % PLACEHOLDERS.length), 3400);
    return () => clearInterval(t);
  }, []);

  // "/" from anywhere puts you at the counter.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = monthSummary(state.expenses);
  const safe = budget ? safeToSpend(state.expenses, budget) : null;
  const punch = punchStats(state.expenses, goal ?? 3);
  const last = state.expenses[0]?.date;
  const gap = last ? differenceInCalendarDays(new Date(), parseISO(last)) : null;
  const price = pickAmount(input);
  const typedAmount = price.picked?.value ?? 0;

  // What Dime says and how he looks, most specific first.
  let line = greeting(hour, name);
  if (arranging) {
    line = touch
      ? "Redecorating? Go wild. Press and hold any card, then drag it. I'll keep everything safe."
      : "Redecorating? Go wild. Drag any card by any part of it, I'll keep everything safe.";
  } else if (reply && !input) {
    line = inLang(lang, reply.text, reply.en, reply.zh);
  } else if (focused && pasted && input) {
    line = "Ooh, a bank text. I'll pull the shop and the amount out of it, don't worry.";
  } else if (focused && isSixSeven(typedAmount)) {
    line = "6… 7… 👀";
  } else if (focused && typedAmount >= 150) {
    line = `${money(typedAmount, 0)}?? Okay… go on.`;
  } else if (focused) {
    line = input ? "Mm-hm. Hit enter when you're done." : "Go on, what'd you get? Or show me the receipt.";
  } else if (state.isLoading) {
    line = "One sec, opening your book…";
  } else if (state.expenses.length === 0) {
    line = `Fresh book! Tell me the first thing you bought, like "coffee & croissant 7".`;
  } else if (gap !== null && gap >= 3) {
    line = `${gap} days and not a single receipt. Either you saved a ton, or you're hiding stuff from me.`;
  } else if (safe && safe.left < 0) {
    line = `Today's over the line by ${money(-safe.left, 0)}. I'm not mad. Okay, a little.`;
  } else if (punch.count === (goal ?? 3) - 1 && !punch.days[punch.todayIndex]) {
    line = `${greeting(hour, name)} One more log and your club card's full :D`;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  // The older two-step path, used only if the server didn't save in one go.
  async function saveSeparately(valid: ParsedExpense[]) {
    const saveRes = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid.map((p) => ({ item_name: p.item_name, amount: p.amount, category: p.category, type: p.type, date: p.date, emoji: p.emoji || null }))),
    });
    if (!saveRes.ok) {
      const data = (await saveRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Couldn't save that");
    }
    return (await saveRes.json()) as ExpenseRow[];
  }

  function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    // One round trip: the server reads it and saves it in the same request.
    void log({ you: text }, (headers) => fetch("/api/parse?save=1", { method: "POST", headers, body: text }));
  }

  // A receipt photo: shrunk here first, then read and saved by the server.
  async function sendPhoto(file: File) {
    if (busy || !file.type.startsWith("image/")) return;
    let blob: Blob;
    try {
      blob = await shrinkPhoto(file);
    } catch {
      toast("Couldn't open that photo. Try a JPEG or PNG?", "error");
      return;
    }
    const photo = URL.createObjectURL(blob);
    void log({ you: "Receipt", photo }, (headers) => fetch("/api/receipt", { method: "POST", headers: { ...headers, "Content-Type": blob.type }, body: blob }));
  }

  async function log(you: { you: string; photo?: string }, request: (headers: Record<string, string>) => Promise<Response>) {
    setBusy(true);
    setReply(null);
    setPending(you.photo ? you : null);
    setPasted(false);
    try {
      // Your date and hour, so "yesterday" and "2am pizza" mean your time, not the server's.
      const headers: Record<string, string> = { [LOCAL_DATE_HEADER]: localISODate(), "x-dime-hour": String(new Date().getHours()) };
      const parseRes = await request(headers);
      if (!parseRes.ok) {
        const data = (await parseRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(parseRes.status === 429 ? "Slow down a little. Try again in a minute." : data.error || "Couldn't read that");
      }
      const data = (await parseRes.json()) as ParsedExpense[] | { parsed: ParsedExpense[]; saved: ExpenseRow[] };
      const parsed = Array.isArray(data) ? data : data.parsed;
      const savedHere = Array.isArray(data) ? null : data.saved;
      const valid = parsed.filter((p) => p.is_expense);
      const comment = parsed[0]?.funny_comment || "";
      const en = parsed[0]?.comment_en || undefined;
      const zh = parsed[0]?.comment_zh || undefined;
      setLang("orig");
      if (!valid.length) {
        setReply({ ...you, items: [], text: comment || "I didn't catch a price in that. How much was it?", en: comment ? en : undefined, zh: comment ? zh : undefined, fresh: true });
        return;
      }
      const saved = savedHere ?? (await saveSeparately(valid));
      addExpenses(saved);
      onLogged(saved.map((x) => x.id));
      if (!you.photo) setInput("");
      const egg = saved.some((x) => isSixSeven(x.amount));
      if (saved.some((x) => x.amount >= BIG_SPEND)) {
        setFlyAmount(saved.reduce((t, x) => t + x.amount, 0));
        setRain((n) => n + 1);
      }
      setReply({ ...you, items: saved, text: egg ? "SIX SEVENNN 🤷 okay okay, logged." : comment || "Noted.", en: egg || !comment ? undefined : en, zh: egg || !comment ? undefined : zh, egg, fresh: true });
    } catch (err) {
      setReply({ ...you, items: [], text: err instanceof Error ? err.message : "Something broke on my side.", tone: "lego", fresh: true });
      toast(err instanceof Error ? err.message : "Something broke", "error");
    } finally {
      setBusy(false);
      setPending(null);
      inputRef.current?.focus();
    }
  }

  // The command menu can log too: it hands the text over here.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    const onLog = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setInput(text);
      sendRef.current(text);
    };
    window.addEventListener("dime:log", onLog);
    return () => window.removeEventListener("dime:log", onLog);
  }, []);

  // The amount you typed, picked out so it can be highlighted (only when it's clear).
  const amount = price.picked;
  const syncMirror = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  async function flip(item: ExpenseRow) {
    const type = item.type === "Need" ? "Want" : "Need";
    setReply((r) => r && { ...r, items: r.items.map((x) => (x.id === item.id ? { ...x, type } : x)) });
    if (!(await updateExpense(item.id, { type }))) toast("Couldn't change that", "error");
    else toast(`Got it. ${item.item_name} goes in ${type === "Want" ? "Lego" : "Life"} from now on.`);
  }

  async function fixPrice(item: ExpenseRow, amount: number) {
    setReply((r) => r && { ...r, items: r.items.map((x) => (x.id === item.id ? { ...x, amount } : x)) });
    if (await updateExpense(item.id, { amount })) toast(`Fixed. ${item.item_name} is ${money(amount)}.`);
    else {
      setReply((r) => r && { ...r, items: r.items.map((x) => (x.id === item.id ? { ...x, amount: item.amount } : x)) });
      toast("Couldn't fix that. Try again?", "error");
    }
  }

  async function undo() {
    if (!reply) return;
    const items = reply.items;
    // The undo line comes in every language, so translating can't bring back
    // the old roast about something that no longer exists.
    setReply((r) => r && { ...r, items: [], text: "Ho gaya. Kuch hua hi nahi, maine kuch nahi dekha.", en: "Done. It never happened. I saw nothing.", zh: "搞定。什么都没发生，我什么也没看见。", egg: false });
    const oks = await Promise.all(items.map((x) => deleteExpense(x.id)));
    if (!oks.every(Boolean)) toast("Couldn't undo all of it", "error");
  }

  // Your side of the conversation: the photo being read, or the last thing you sent.
  const mine = busy ? pending : reply && !input ? reply : null;
  // Let go of the last photo's preview once it's off screen.
  const shown = reply?.photo;
  useEffect(() => () => {
    if (shown) URL.revokeObjectURL(shown);
  }, [shown]);

  const pace = budget ? Math.min(1, new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) : 0;

  return (
    <section className="grid grid-cols-12 items-start gap-y-8 lg:gap-x-10">
      {rain > 0 && <CashFly key={rain} amount={flyAmount} onDone={stopRain} />}
      {/* The conversation with Dime */}
      <div className="col-span-12 lg:col-span-7">
        <div className="max-w-[640px]">
          <div className="flex min-h-[112px] flex-col justify-end gap-2.5 sm:min-h-[132px]">
            <Speaker />
            <AnimatePresence initial={false} mode="popLayout">
              {mine && (
                <motion.div
                  // Same key while a photo is read and once it's logged, so it doesn't re-enter.
                  key={"you" + mine.you + (mine.photo ?? "")}
                  layout="position"
                  initial={reply?.fresh === false && !busy ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -4, transition: LEAVE_QUICK }}
                  transition={{ duration: 0.2 }}
                >
                  <Bubble from="you" text={mine.photo ? "Receipt 📸" : mine.you} still={reply?.fresh === false && !busy}>
                    {mine.photo && (
                      // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, nothing to optimise
                      <img src={mine.photo} alt="Your receipt" className="mt-2 max-h-24 w-auto max-w-[140px] rounded-[6px] object-contain" />
                    )}
                  </Bubble>
                </motion.div>
              )}
              {busy ? (
                <motion.div key="typing" layout="position">
                  <TypingBubble className="bg-paper shadow-paper" />
                </motion.div>
              ) : (
              // Position only: the bubble resizes itself, and scaling the
              // wrapper too would stretch the text for a frame.
              <motion.div key="dime" layout="position">
                <Bubble
                  text={line}
                  tone={reply && !input && !busy ? reply.tone : undefined}
                  scramble={!!(reply && !input && !busy && reply.en)}
                  instant={!!(reply && !input && !reply.fresh)}
                >
                  {reply && !input && !busy && reply.items.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {reply.items.map((x) => (
                        <span key={x.id} className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-[8px] bg-oat py-1.5 pl-2.5 pr-3 text-[14px]">
                          <TypeCoin type={x.type} onFlip={() => flip(x)} label className="pointer-coarse:-my-1.5 pointer-coarse:py-1.5" />
                          {x.amount >= BIG_SPEND && (
                            <span data-cash-chip className="inline-flex">
                              <CashBill size={24} burst={reply.fresh} />
                            </span>
                          )}
                          <span className="min-w-0 truncate font-medium">{x.item_name}</span>
                          <PriceFix amount={x.amount} onFix={(amount) => fixPrice(x, amount)} />
                        </span>
                      ))}
                      <button onClick={undo} className="rounded-[8px] px-2.5 py-1.5 text-[14px] font-semibold text-ink-2 hover:bg-oat hover:text-ink">
                        Undo
                      </button>
                      {reply.en && <TranslateToggle lang={lang} onChange={setLang} hasZh={!!reply.zh} className="ml-auto" />}
                    </div>
                  )}
                  {reply && !input && !busy && reply.items.length === 0 && reply.en && (
                    <div className="mt-2 flex">
                      <TranslateToggle lang={lang} onChange={setLang} hasZh={!!reply.zh} className="-ml-2" />
                    </div>
                  )}
                </Bubble>
              </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form
            onSubmit={submit}
            // Drop a receipt photo on the box to log it.
            onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
            onDrop={(e) => {
              const image = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
              if (!image) return;
              e.preventDefault();
              void sendPhoto(image);
            }}
            className="relative mt-4 sm:mt-5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!e.target.value) setPasted(false);
                // Typing again means you've seen the reply: no encore when it comes back.
                else if (reply?.fresh) setReply({ ...reply, fresh: false });
                requestAnimationFrame(syncMirror);
              }}
              onPaste={(e) => {
                // A pasted screenshot or photo of a receipt gets read, not typed.
                const image = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
                if (image) {
                  e.preventDefault();
                  void sendPhoto(image);
                  return;
                }
                const t = e.clipboardData.getData("text");
                if (t.length > 40 && /\$|cad|charged|purchase|debit|card|spent/i.test(t)) setPasted(true);
              }}
              onSelect={syncMirror}
              onKeyUp={syncMirror}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              readOnly={busy}
              maxLength={2000}
              enterKeyHint="send"
              aria-label="What did you spend on?"
              className={`relative h-14 w-full rounded-[10px] bg-paper pl-4 sm:h-16 sm:pl-6 pr-[118px] sm:pr-[170px] text-[17px] font-medium shadow-paper sm:text-[20px] caret-ink outline-none ring-2 ring-transparent transition-shadow focus:ring-ink ${
                input ? "text-transparent" : "text-ink"
              }`}
            />
            {/* What you typed, drawn again with the amount picked out. */}
            {input && (
              <div
                ref={mirrorRef}
                aria-hidden
                className={`pointer-events-none absolute inset-y-0 left-0 right-[118px] sm:right-[170px] flex items-center overflow-hidden whitespace-pre pl-4 text-[17px] font-medium text-ink sm:pl-6 sm:text-[20px]`}
              >
                {amount ? (
                  <>
                    {input.slice(0, amount.start)}
                    <span className="rounded-[4px] bg-[color-mix(in_oklab,var(--lego)_16%,transparent)] text-lego [box-shadow:0_0_0_3px_color-mix(in_oklab,var(--lego)_16%,transparent)]">
                      {input.slice(amount.start, amount.end)}
                    </span>
                    {input.slice(amount.end)}
                  </>
                ) : (
                  input
                )}
              </div>
            )}
            <AnimatePresence>
              {amount && !busy && (
                <motion.span
                  key="price"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8, transition: LEAVE_QUICK }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                  className="absolute right-[58px] top-1/2 flex -translate-y-1/2 items-center gap-1 text-[14px] font-semibold sm:right-[64px] sm:gap-1.5"
                >
<span className="pointer-events-none text-ink-3">{money(amount.value)}</span>
                </motion.span>
              )}
            </AnimatePresence>
            {!input && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={ph}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="pointer-events-none absolute inset-y-0 left-4 right-[104px] flex items-center overflow-hidden whitespace-nowrap text-[17px] font-medium text-ink-3 sm:left-6 sm:right-auto sm:text-[20px]"
                >
                  {PLACEHOLDERS[ph]}
                </motion.span>
              </AnimatePresence>
            )}
            {/* A receipt photo instead of typing: camera or library on phones. */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void sendPhoto(file);
              }}
            />
            <AnimatePresence>
              {!input && !busy && (
                <motion.button
                  key="photo"
                  type="button"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: LEAVE_QUICK }}
                  transition={{ duration: 0.18, ease: EASE_OUT }}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Log a receipt photo"
                  title="Snap or pick a receipt. I'll read the store and the total"
                  className="absolute right-[54px] top-1.5 flex h-11 w-11 items-center justify-center rounded-[8px] text-ink-3 transition-colors hover:bg-oat hover:text-ink sm:right-[62px] sm:top-2.5"
                >
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.4-2h5.8l1.4 2h1.2A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
            {!input && !focused && (
              <kbd className="pointer-events-none absolute right-[112px] top-1/2 hidden -translate-y-1/2 rounded-[8px] border border-line-strong px-2 py-0.5 text-[13px] font-semibold text-ink-3 sm:block pointer-coarse:hidden">
                /
              </kbd>
            )}
            <motion.button
              type="submit"
              aria-label="Log it"
              disabled={!input.trim() || busy}
              animate={{ scale: input.trim() || busy ? 1 : 0.85, opacity: input.trim() || busy ? 1 : 0.35 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-ink text-paper sm:right-2.5 sm:top-2.5"
            >
              {busy ? (
                <motion.span className="h-4 w-4 rounded-full border-2 border-paper/40 border-t-paper" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              )}
            </motion.button>
          </form>

        </div>
      </div>

      {/* The month so far */}
      <div className="col-span-12 lg:col-span-5 lg:pl-6">
        <p className="flex items-center gap-1 text-[15px] font-medium text-ink-2">
          <span className="min-w-[4ch]">{month}</span> so far
          <InfoTip label="About this month's numbers">
            Everything you&apos;ve spent this month. The bar splits it into <b>Life</b> (needs) and <b>Lego</b> (wants).
            {budget ? (
              <>
                {" "}With a budget, the bar fills toward it, and the thin mark is where you&apos;d be today at an even pace: past the mark means you&apos;re
                spending faster than the budget allows. &ldquo;Safe to spend today&rdquo; is what&apos;s left for today if you want to end the month on budget.
              </>
            ) : (
              <> Set a monthly budget and this also tells you what&apos;s safe to spend each day.</>
            )}
          </InfoTip>
        </p>
        <div data-month-total className="mt-1 w-fit origin-left">
          <Money value={s.total} className="block text-[52px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[64px]" />
        </div>

        <div className="relative mt-4 h-3.5 overflow-hidden rounded-full bg-panel">
          <motion.div
            className="flex h-full overflow-hidden rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${budget ? Math.min(100, (s.total / budget) * 100) : 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          >
            <motion.span className="h-full bg-life" animate={{ flexGrow: s.needs }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
            <motion.span className="relative -ml-px h-full bg-lego" animate={{ flexGrow: s.wants }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
          </motion.div>
          {/* Where you'd be today if you spread the budget evenly. Pointless (and
              easy to mistake for a glitch) in the last days of the month. */}
          {budget && month && pace < 0.95 && (
            <span
              className="absolute inset-y-[3px] w-[2px] rounded-full bg-ink/50 mix-blend-normal"
              style={{ left: `calc(${pace * 100}% - 1px)` }}
              title="Even pace: where you'd be today if you spread your budget evenly over the month"
            />
          )}
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[13px] font-medium">
          <span>
            <span className="inline-flex items-center gap-1 text-life"><LifeCoin size={13} /> Life {money(s.needs, 0)}</span>
            <span className="text-ink-3"> · </span>
            <span className="inline-flex items-center gap-1 text-lego"><LegoBrick size={14} /> Lego {money(s.wants, 0)}</span>
          </span>
          {budget && !editingBudget ? (
            <button onClick={() => setEditingBudget(true)} className="text-ink-3 underline decoration-dotted underline-offset-4 hover:text-ink" title="Change budget">
              of {money(budget, 0)}
            </button>
          ) : null}
        </div>

        <p className="mt-4 max-w-[400px] text-[15px] leading-snug text-ink-2 sm:mt-5 sm:text-[16px]">
          {state.isLoading ? (
            <span aria-hidden>&nbsp;</span>
          ) : budget && safe ? (
            safe.left >= 0 ? (
              <>
                You can still spend <span className="font-semibold text-ink">{money(safe.left, 0)}</span> today and stay on track.{" "}
                {money(budget - s.total, 0)} left for {s.daysLeft + 1} days.
              </>
            ) : (
              <>
                Today is <span className="font-semibold text-lego">{money(-safe.left, 0)}</span> over the daily line. Tomorrow&apos;s a new day.
              </>
            )
          ) : s.delta !== null ? (
            <>
              That&apos;s <span className="font-semibold text-ink">{Math.abs(Math.round(s.delta * 100))}% {s.delta > 0 ? "more" : "less"}</span>{" "}
              than this point last month.
            </>
          ) : (
            <>Set a monthly budget and I&apos;ll tell you what&apos;s safe to spend each day.</>
          )}
        </p>

        <AnimatePresence initial={false} mode="wait">
          {editingBudget ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                setBudget(Number(new FormData(e.currentTarget).get("b")) || null);
                setEditingBudget(false);
              }}
              className="mt-4 flex items-center gap-2"
            >
              <span className="text-[16px] font-semibold text-ink-2">$</span>
              <input
                name="b"
                type="number"
                min="0"
                autoFocus
                defaultValue={budget ?? ""}
                placeholder="2500"
                onKeyDown={(e) => e.key === "Escape" && setEditingBudget(false)}
                className="h-10 w-32 rounded-[8px] bg-panel px-3 text-[16px] font-semibold outline-none ring-2 ring-transparent focus:ring-ink"
              />
              <span className="text-[14px] text-ink-3">a month</span>
              <button className="ml-1 h-10 rounded-[8px] bg-ink px-4 text-[14px] font-semibold text-paper">Save</button>
            </motion.form>
          ) : (
            !budget && (
              <motion.button
                key="set"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setEditingBudget(true)}
                className="mt-4 h-10 rounded-[8px] border-2 border-dashed border-line-strong px-4 text-[14px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
              >
                Set a monthly budget
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
