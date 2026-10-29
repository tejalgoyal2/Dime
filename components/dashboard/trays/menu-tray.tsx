"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ClipboardPaste, Download, LogOut, Target, Zap } from "lucide-react";
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
  const [palette, setPalette] = usePalette();
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
                className="relative z-[3] flex aspect-square items-center justify-center rounded-[12px] transition-transform duration-200 hover:scale-110 active:scale-95"
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
            onClick={() => downloadCsv(state.expenses)}
          />
          <li className="border-b border-line px-4 py-3">
            <p className="text-[15px] font-medium">Colours</p>
            <div ref={swatches} className="relative mt-2.5 grid grid-cols-3 gap-2">
              <GlideOutline container={swatches} active={palette} className="rounded-[10px] ring-2 ring-ink" />
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  aria-pressed={palette === p.id}
                  data-active={palette === p.id}
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
              value={mode}
              onChange={setMode}
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

        <ul className="overflow-hidden rounded-[10px] bg-sunken">
          <Row icon={<LogOut size={18} />} label="Sign out" onClick={signOut} danger />
        </ul>

        <p className="flex justify-center gap-3 pb-1 text-[13px] text-ink-3">
          <a href="https://github.com/tejalgoyal2/Dime" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
          <span>·</span>
          <a href="https://tgoyal.me" target="_blank" rel="noopener noreferrer" className="hover:text-ink">tgoyal.me</a>
        </p>
      </div>
    </Tray>
  );
}
