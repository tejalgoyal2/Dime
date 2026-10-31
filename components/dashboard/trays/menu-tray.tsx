"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ClipboardPaste, Download, LogOut, Target, Trash2, Zap } from "lucide-react";
import { Pills } from "@/components/ui/pills";
import { GlideOutline } from "@/components/ui/glide";
import { ANIMALS, AnimalAvatar, type Animal } from "@/components/ui/animal";
import { createClient } from "@/lib/supabase/client";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Tray } from "@/components/ui/tray";
import { downloadCsv } from "@/lib/csv-export";
import { useBudget } from "@/lib/use-budget";
import { PALETTES, usePalette } from "@/lib/use-palette";

export type TrayName = "menu" | "import" | "autolog";

function Row({
  icon,
  label,
  detail,
  onClick,
  danger,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onClick?: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-line ${danger ? "text-danger" : "text-ink"}`}
      >
        <span className={danger ? "" : "text-ink-2"}>{icon}</span>
        <span className="flex-1">
          <span className="block text-[15px] font-medium">{label}</span>
          {detail && <span className="block text-[13px] text-ink-3">{detail}</span>}
        </span>
        {children ?? (!danger && <ChevronRight size={16} className="text-ink-3" />)}
      </button>
    </li>
  );
}

export function MenuTray({
  open,
  onClose,
  onOpen,
  callsign,
  animal,
  onAnimal,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (t: TrayName) => void;
  callsign: string;
  animal: Animal;
  onAnimal: (a: Animal) => void;
}) {
  const { state } = useExpenses();
  const { mode, setMode, theme } = useTheme();
  const [budget, setBudget] = useBudget();
  const [editingBudget, setEditingBudget] = useState(false);
  const [palette, setPaletteNow] = usePalette();
  // Day/night and palette changes crossfade the whole page. Let the marker
  // finish its glide first, then apply, so the two never fight (that was the
  // jitter). The marker follows `pending` right away.
  const [pendingMode, setPendingMode] = useState<typeof mode | null>(null);
  const [pendingPalette, setPendingPalette] = useState<typeof palette | null>(null);
  const chooseMode = (m: typeof mode) => {
    setPendingMode(m);
    setTimeout(() => {
      setMode(m);
      setPendingMode(null);
    }, 300);
  };
  const setPalette = (p: typeof palette) => {
    setPendingPalette(p);
    setTimeout(() => {
      setPaletteNow(p);
      setPendingPalette(null);
    }, 300);
  };
  const shownPalette = pendingPalette ?? palette;
  const swatches = useRef<HTMLDivElement>(null);
  const zoo = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Tray open={open} onClose={onClose} title={callsign} icon={<AnimalAvatar animal={animal} size={36} />}>
      <div className="space-y-4">
        <div className="rounded-[10px] bg-sunken px-4 py-3">
          <p className="text-[15px] font-medium">Your animal</p>
          <div ref={zoo} className="relative mt-2 grid grid-cols-8 gap-1">
            <GlideOutline container={zoo} active={animal} className="rounded-[12px] bg-paper shadow-paper ring-2 ring-ink" />
            {ANIMALS.map((a) => (
              <button
                key={a}
                onClick={() => onAnimal(a)}
                aria-label={a}
                aria-pressed={animal === a}
                data-active={animal === a}
                className="relative z-[3] flex aspect-square items-center justify-center rounded-[12px] transition-transform duration-200 active:scale-95"
              >
                <AnimalAvatar animal={a} size={34} className={animal === a ? "" : "opacity-80 transition-opacity hover:opacity-100"} />
              </button>
            ))}
          </div>
        </div>

        <ul className="overflow-hidden rounded-[10px] bg-sunken">
          <Row icon={<Zap size={18} />} label="Auto-log" detail="Let bank texts log themselves" onClick={() => onOpen("autolog")} />
          <Row icon={<ClipboardPaste size={18} />} label="Paste a bunch" detail="Statements, lists, whatever" onClick={() => onOpen("import")} />
        </ul>

        <ul className="overflow-hidden rounded-[10px] bg-sunken">
          {editingBudget ? (
            <li className="flex items-center gap-3 px-4 py-2.5">
              <Target size={18} className="text-ink-2" />
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setBudget(Number(new FormData(e.currentTarget).get("b")) || null);
                  setEditingBudget(false);
                }}
              >
                <span className="text-[15px] text-ink-2">$</span>
                <input
                  name="b"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  autoFocus
                  defaultValue={budget ?? ""}
                  placeholder="Monthly budget"
                  onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                  className="min-w-0 flex-1 bg-transparent py-1 text-[15px] font-medium outline-none placeholder:text-ink-3"
                />
                <span className="text-[13px] text-ink-3">↵</span>
              </form>
            </li>
          ) : (
            <Row
              icon={<Target size={18} />}
              label="Monthly budget"
              detail={budget ? `$${budget.toLocaleString()} a month` : "Not set. Set one and Dime tells you what's safe to spend each day."}
              onClick={() => setEditingBudget(true)}
            />
          )}
          <Row
            icon={<Download size={18} />}
            label="Export CSV"
            detail={`${state.expenses.length} expenses`}
            onClick={() => downloadCsv()}
          />
          <li className="border-b border-line px-4 py-3">
            <p className="text-[15px] font-medium">Colours</p>
            <div ref={swatches} className="relative mt-2.5 grid grid-cols-3 gap-2">
              <GlideOutline container={swatches} active={shownPalette} className="rounded-[10px] ring-2 ring-ink" />
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  aria-pressed={shownPalette === p.id}
                  data-active={shownPalette === p.id}
                  className="overflow-hidden rounded-[10px] text-left ring-2 ring-transparent transition-shadow duration-200 hover:ring-line-strong"
                >
                  {/* Each swatch shows the palette as it looks right now, day or night. */}
                  <span className="flex gap-1 p-2.5" style={{ background: p[theme === "dark" ? "night" : "day"].bg }}>
                    <span className="h-4 w-4 rounded-full" style={{ background: p[theme === "dark" ? "night" : "day"].life }} />
                    <span className="h-4 w-4 rounded-full" style={{ background: p[theme === "dark" ? "night" : "day"].lego }} />
                  </span>
                  <span className="block bg-paper px-2.5 py-1.5 text-[12px] font-semibold text-ink">{p.name}</span>
                </button>
              ))}
            </div>
          </li>
          <li className="border-b border-line px-4 py-3">
            <p className="text-[15px] font-medium">Day or night</p>
            <Pills
              label="Day or night"
              value={pendingMode ?? mode}
              onChange={chooseMode}
              options={[
                { value: "light", label: "Day" },
                { value: "dark", label: "Night" },
                { value: "system", label: "Auto" },
              ]}
              className="mt-2.5 rounded-[10px] bg-oat p-1"
              buttonClassName="h-8 flex-1 rounded-[8px] text-[13px] font-semibold"
            />
          </li>
        </ul>

        <AccountActions callsign={callsign} onSignOut={signOut} />

        <p className="flex justify-center gap-3 pb-1 text-[13px] text-ink-3">
          <a href="https://github.com/tejalgoyal2/Dime" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
          <span>·</span>
          <a href="https://tgoyal.me" target="_blank" rel="noopener noreferrer" className="hover:text-ink">tgoyal.me</a>
        </p>
      </div>
    </Tray>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Sign out (with an "are you sure"), and delete everything (with two).
function AccountActions({ callsign, onSignOut }: { callsign: string; onSignOut: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "signout" | "delete1" | "delete2" | "deleting">("idle");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === callsign.trim().toLowerCase();

  async function deleteEverything() {
    setStep("deleting");
    setError(null);
    const r = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    if (!r?.ok) {
      const d = (await r?.json().catch(() => null)) as { error?: string } | null;
      setError(d?.error ?? "Couldn't reach the server. Nothing was deleted.");
      setStep("delete2");
      return;
    }
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("dime-") && k !== "dime-theme" && k !== "dime-palette") localStorage.removeItem(k);
    } catch {}
    router.replace("/login?bye=1");
    router.refresh();
  }

  const btn = "h-9 rounded-[8px] px-4 text-[14px] font-semibold transition-[transform,background-color,opacity] duration-200 active:scale-95 disabled:opacity-40";
  return (
    <div className="overflow-hidden rounded-[10px] bg-sunken">
      <AnimatePresence initial={false} mode="popLayout">
        {step === "idle" && (
          <motion.ul key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <Row icon={<LogOut size={18} />} label="Sign out" onClick={() => setStep("signout")} danger />
            <Row icon={<Trash2 size={18} />} label="Delete my account" detail="Everything, forever" onClick={() => setStep("delete1")} danger />
          </motion.ul>
        )}
        {step !== "idle" && (
          <motion.div
            key={step === "deleting" ? "delete2" : step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
            className="px-4 py-4"
          >
            {step === "signout" && (
              <>
                <p className="text-[15px] font-medium">Heading out already? I&apos;ll keep your receipts warm.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setStep("idle")} className={`${btn} flex-1 bg-paper text-ink`}>Stay</button>
                  <button onClick={onSignOut} className={`${btn} flex-1 bg-ink text-paper`}>Sign out</button>
                </div>
              </>
            )}
            {step === "delete1" && (
              <>
                <p className="text-[15px] font-medium">Whoa, whoa. This deletes everything.</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-2">
                  Every expense, your auto-log tokens, your layout, your animal. No undo, no backup, no &ldquo;restore from the cloud&rdquo;. There is no
                  cloud. It&apos;s just me.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setStep("idle")} className={`${btn} flex-1 bg-paper text-ink`}>Keep my stuff</button>
                  <button onClick={() => setStep("delete2")} className={`${btn} flex-1 bg-danger text-white`}>Yes, delete it all</button>
                </div>
              </>
            )}
            {(step === "delete2" || step === "deleting") && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (matches && step === "delete2") void deleteEverything();
                }}
              >
                <p className="text-[15px] font-medium">Okay. Final answer?</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-2">
                  Type <span className="font-semibold text-ink">{callsign}</span> to say goodbye. Dime will miss you. Your coffee habit won&apos;t.
                </p>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={callsign}
                  aria-label="Type your name to confirm"
                  disabled={step === "deleting"}
                  className="mt-3 h-10 w-full rounded-[8px] bg-paper px-3 text-[15px] font-medium outline-none ring-2 ring-transparent transition-shadow focus:ring-danger"
                />
                {error && <p className="mt-2 text-[13px] font-medium text-danger">{error}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setStep("idle"); setTyped(""); setError(null); }} disabled={step === "deleting"} className={`${btn} flex-1 bg-paper text-ink`}>
                    Never mind
                  </button>
                  <button type="submit" disabled={!matches || step === "deleting"} className={`${btn} flex-1 bg-danger text-white`}>
                    {step === "deleting" ? "Shredding receipts…" : "Delete forever"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
