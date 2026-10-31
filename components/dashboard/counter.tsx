"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT, LEAVE_QUICK } from "@/lib/motion";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Bubble, Speaker, TypingBubble } from "@/components/dime/bubble";
import { CashBill, CashRain } from "@/components/ui/cash-bill";
import { inLang, TranslateToggle, type Lang } from "@/components/ui/translate";
import { BIG_SPEND, isSixSeven, pickAmount } from "@/lib/amounts";
import { Money, money } from "@/components/ui/money";
import { LOCAL_DATE_HEADER, localISODate } from "@/lib/dates";
import { monthSummary, punchStats, safeToSpend } from "@/lib/stats";
import { useBudget, usePunchGoal } from "@/lib/use-budget";
import type { ExpenseRow } from "@/lib/supabase/types";
import type { ParsedExpense } from "@/lib/schemas/expense";
import { TypeCoin } from "./cells/type-coin";

const PLACEHOLDERS = ["coffee & croissant 7", "uber home 18", "groceries at freshco 84", "netflix 16.99", "2am pizza 22, again", "gym 50", "bubble tea 8"];

const noop = () => () => {};

type Reply = { you: string; items: ExpenseRow[]; text: string; en?: string; zh?: string; tone?: "lego"; egg?: boolean } | null;

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
  // Which number is the price, when you typed more than one.
  const [chosen, setChosen] = useState<number | null>(null);
  // Which language my Hinglish reply is showing in.
  const [lang, setLang] = useState<Lang>("orig");
  // A few bills fall when something big gets logged.
  const [rain, setRain] = useState(0);
  const stopRain = useCallback(() => setRain(0), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => -1);
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
  const price = pickAmount(input, chosen);
  const typedAmount = price.picked?.value ?? 0;

  // What Dime says and how he looks, most specific first.
  let line = greeting(hour, name);
  if (arranging) {
    line = "Redecorating? Go wild. Drag any card by any part of it, I'll keep everything safe.";
  } else if (reply && !input) {
    line = inLang(lang, reply.text, reply.en, reply.zh);
  } else if (focused && pasted && input) {
    line = "Ooh, a bank text. I'll pull the shop and the amount out of it, don't worry.";
  } else if (focused && price.ambiguous) {
    line = `Two numbers in there. Is the price ${money(typedAmount)}? Tap the other one if not.`;
  } else if (focused && isSixSeven(typedAmount)) {
    line = "6… 7… 👀";
  } else if (focused && typedAmount >= 150) {
    line = `${money(typedAmount, 0)}?? Okay… go on.`;
  } else if (focused) {
    line = input ? "Mm-hm. Hit enter when you're done." : "Go on, what'd you get?";
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

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const hint = pickAmount(text, chosen);
    setBusy(true);
    setReply(null);
    setPasted(false);
    try {
      const headers: Record<string, string> = { [LOCAL_DATE_HEADER]: localISODate() };
      // When there was a choice to make, tell the server which number is the price.
      if (hint.ambiguous && hint.picked) headers["x-dime-amount"] = String(hint.picked.value);
      const parseRes = await fetch("/api/parse", { method: "POST", headers, body: text });
      if (!parseRes.ok) {
        const data = (await parseRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(parseRes.status === 429 ? "Slow down a little. Try again in a minute." : data.error || "Couldn't read that");
      }
      const parsed = (await parseRes.json()) as ParsedExpense[];
      const valid = parsed.filter((p) => p.is_expense);
      const comment = parsed[0]?.funny_comment || "";
      const en = parsed[0]?.comment_en || undefined;
      const zh = parsed[0]?.comment_zh || undefined;
      setLang("orig");
      if (!valid.length) {
        setReply({ you: text, items: [], text: comment || "I didn't catch a price in that. How much was it?", en: comment ? en : undefined, zh: comment ? zh : undefined });
        return;
      }
      const saveRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          valid.map((p) => ({ item_name: p.item_name, amount: p.amount, category: p.category, type: p.type, date: p.date, emoji: p.emoji || null }))
        ),
      });
      if (!saveRes.ok) {
        const data = (await saveRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Couldn't save that");
      }
      const saved = (await saveRes.json()) as ExpenseRow[];
      addExpenses(saved);
      onLogged(saved.map((x) => x.id));
      setInput("");
      setChosen(null);
      const egg = saved.some((x) => isSixSeven(x.amount));
      if (saved.some((x) => x.amount >= BIG_SPEND)) setRain((n) => n + 1);
      setReply({ you: text, items: saved, text: egg ? "SIX SEVENNN 🤷 okay okay, logged." : comment || "Noted.", en: egg || !comment ? undefined : en, zh: egg || !comment ? undefined : zh, egg });
    } catch (err) {
      setReply({ you: text, items: [], text: err instanceof Error ? err.message : "Something broke on my side.", tone: "lego" });
      toast(err instanceof Error ? err.message : "Something broke", "error");
    } finally {
      setBusy(false);
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

  // The amount you typed, picked out so it can be highlighted.
  const amount = price.picked;
  const other = price.ambiguous ? price.pool.filter((t) => t.value !== amount?.value).at(-1) : undefined;
  const syncMirror = () => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  async function flip(item: ExpenseRow) {
    const type = item.type === "Need" ? "Want" : "Need";
    setReply((r) => r && { ...r, items: r.items.map((x) => (x.id === item.id ? { ...x, type } : x)) });
    if (!(await updateExpense(item.id, { type }))) toast("Couldn't change that", "error");
    else toast(`Got it. ${item.item_name} goes in ${type === "Want" ? "Lego" : "Life"} from now on.`);
  }

  async function undo() {
    if (!reply) return;
    const items = reply.items;
    setReply((r) => r && { ...r, items: [], text: "Done. It never happened. I saw nothing." });
    const oks = await Promise.all(items.map((x) => deleteExpense(x.id)));
    if (!oks.every(Boolean)) toast("Couldn't undo all of it", "error");
  }

  const pace = budget ? Math.min(1, new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) : 0;

  return (
    <section className="grid grid-cols-12 items-start gap-x-10 gap-y-8">
      {rain > 0 && <CashRain key={rain} onDone={stopRain} />}
      {/* The conversation with Dime */}
      <div className="col-span-12 lg:col-span-7">
        <div className="max-w-[640px]">
          <div className="flex min-h-[132px] flex-col justify-end gap-2.5">
            <Speaker />
            <AnimatePresence initial={false} mode="popLayout">
              {reply && !input && !busy && (
                <motion.div key={"you" + reply.you} layout exit={{ opacity: 0, y: -4, transition: LEAVE_QUICK }}>
                  <Bubble from="you" text={reply.you} />
                </motion.div>
              )}
              {busy ? (
                <motion.div key="typing" layout="position">
                  <TypingBubble className="bg-paper shadow-paper" />
                </motion.div>
              ) : (
              <motion.div key="dime" layout className={reply?.egg && !input ? "six-seven" : undefined}>
                <Bubble text={line} tone={reply && !input && !busy ? reply.tone : undefined} scramble={!!(reply && !input && !busy && reply.en)}>
                  {reply && !input && !busy && reply.items.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {reply.items.map((x) => (
                        <span key={x.id} className="inline-flex items-center gap-2.5 rounded-[8px] bg-oat py-1.5 pl-2.5 pr-3 text-[14px]">
                          <TypeCoin type={x.type} onFlip={() => flip(x)} label />
                          {x.amount >= BIG_SPEND && <CashBill size={24} burst />}
                          <span className="font-medium">{x.item_name}</span>
                          <span className="font-semibold">{money(x.amount)}</span>
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

          <form onSubmit={submit} className="relative mt-5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (!e.target.value) {
                  setPasted(false);
                  setChosen(null);
                }
                requestAnimationFrame(syncMirror);
              }}
              onPaste={(e) => {
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
              className={`relative h-16 w-full rounded-[10px] bg-paper pl-6 ${other ? "pr-[230px]" : "pr-[170px]"} text-[20px] font-medium shadow-paper caret-ink outline-none ring-2 ring-transparent transition-shadow focus:ring-ink ${
                input ? "text-transparent" : "text-ink"
              }`}
            />
            {/* What you typed, drawn again with the amount picked out. */}
            {input && (
              <div
                ref={mirrorRef}
                aria-hidden
                className={`pointer-events-none absolute inset-y-0 left-0 ${other ? "right-[230px]" : "right-[170px]"} flex items-center overflow-hidden whitespace-pre pl-6 text-[20px] font-medium text-ink`}
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
                  className="absolute right-[64px] top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[14px] font-semibold"
                >
                  {other && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setChosen(other.value)}
                      title="That one's the price"
                      className="rounded-[8px] px-2 py-1 text-ink-3 line-through decoration-ink-3/50 transition-colors hover:bg-oat hover:text-ink hover:no-underline"
                    >
                      {money(other.value)}
                    </button>
                  )}
                  <span className={`pointer-events-none ${other ? "rounded-[8px] bg-oat px-2 py-1 text-ink" : "text-ink-3"}`}>{money(amount.value)}</span>
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
                  className="pointer-events-none absolute inset-y-0 left-6 flex items-center text-[20px] font-medium text-ink-3"
                >
                  {PLACEHOLDERS[ph]}
                </motion.span>
              </AnimatePresence>
            )}
            {!input && !focused && (
              <kbd className="pointer-events-none absolute right-[76px] top-1/2 -translate-y-1/2 rounded-[8px] border border-line-strong px-2 py-0.5 text-[13px] font-semibold text-ink-3">
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
              className="absolute right-2.5 top-2.5 flex h-11 w-11 items-center justify-center rounded-[8px] bg-ink text-paper"
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
        <p className="text-[15px] font-medium text-ink-2">{format(new Date(), "MMMM")} so far</p>
        <Money value={s.total} className="mt-1 block text-[64px] font-semibold leading-[1.02] tracking-[-0.035em]" />

        <div className="relative mt-4 h-3.5 overflow-hidden rounded-full bg-panel">
          <motion.div
            className="flex h-full overflow-hidden rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${budget ? Math.min(100, (s.total / budget) * 100) : 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          >
            <motion.span className="h-full bg-life" animate={{ flexGrow: s.needs }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
            <motion.span className="h-full bg-lego" animate={{ flexGrow: s.wants }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
          </motion.div>
          {budget && <span className="absolute inset-y-0 w-[3px] rounded-[8px] bg-ink" style={{ left: `calc(${pace * 100}% - 1.5px)` }} title="Where you'd be at an even pace" />}
        </div>
        <div className="mt-2 flex justify-between text-[13px] font-medium">
          <span>
            <span className="text-life">Life {money(s.needs, 0)}</span>
            <span className="text-ink-3"> · </span>
            <span className="text-lego">Lego {money(s.wants, 0)}</span>
          </span>
          {budget && !editingBudget ? (
            <button onClick={() => setEditingBudget(true)} className="text-ink-3 underline decoration-dotted underline-offset-4 hover:text-ink" title="Change budget">
              of {money(budget, 0)}
            </button>
          ) : null}
        </div>

        <p className="mt-5 max-w-[400px] text-[16px] leading-snug text-ink-2">
          {budget && safe ? (
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
