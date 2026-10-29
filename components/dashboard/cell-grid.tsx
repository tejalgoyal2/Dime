"use client";

import { useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CELL_INFO, DEFAULT_LAYOUT, type Cell, type CellType, type Layout, type Size } from "@/lib/dashboard/layout";
import { ReceiptCell } from "./cells/receipt";
import { SeesawCell } from "./cells/seesaw";
import { PunchCell } from "./cells/punch";
import { TrendsCell } from "./cells/trends";
import { TakeCell } from "./cells/take";
import { YearCell } from "./cells/year";
import { ClockCell, HitsCell, SparksCell } from "./cells/more";
import { CategoriesCell, SubsCell, WeekdayCell } from "./cells/lists";

const RENDER: Record<CellType, () => React.ReactNode> = {
  trends: () => <TrendsCell />,
  receipt: () => <ReceiptCell />,
  seesaw: () => <SeesawCell />,
  punch: () => <PunchCell />,
  year: () => <YearCell />,
  take: () => <TakeCell />,
  categories: () => <CategoriesCell />,
  subs: () => <SubsCell />,
  weekday: () => <WeekdayCell />,
  hits: () => <HitsCell />,
  clock: () => <ClockCell />,
  sparks: () => <SparksCell />,
};

const SPAN_CLASS: Record<Size, string> = { s: "col-span-12 md:col-span-6 xl:col-span-4", m: "col-span-12 xl:col-span-6", l: "col-span-12 xl:col-span-8" };
const SIZE_LABEL: Record<Size, string> = { s: "⅓", m: "½", l: "⅔" };
const glide = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;

// Prefer whatever the pointer is actually over; fall back to the nearest cell.
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

/**
 * The cells under the counter. In arrange mode you drag a cell by any part of
 * it; the others slide out of the way as you go (live reorder + layout
 * springs), and each cell can be resized or put away.
 */
export function CellGrid({ layout, setLayout, arranging }: { layout: Layout; setLayout: (fn: (l: Layout) => Layout) => void; arranging: boolean }) {
  const [active, setActive] = useState<{ id: CellType; w: number; h: number } | null>(null);
  const lastMove = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const shown = layout.filter((c) => !c.hidden);
  const hidden = layout.filter((c) => c.hidden);

  function onStart(e: DragStartEvent) {
    const r = e.active.rect.current.initial;
    setActive({ id: e.active.id as CellType, w: r?.width ?? 400, h: r?.height ?? 300 });
  }

  // Reorder as you drag, so the grid makes room under the pointer.
  function onOver(e: DragOverEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const now = performance.now();
    if (now - lastMove.current < 160) return;
    lastMove.current = now;
    setLayout((l) => {
      const from = l.findIndex((c) => c.id === a.id);
      const to = l.findIndex((c) => c.id === over.id);
      if (from < 0 || to < 0) return l;
      const next = [...l];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onEnd() {
    setActive(null);
  }

  const update = (id: CellType, patch: Partial<Cell>) => setLayout((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <LayoutGroup>
      <AnimatePresence initial={false}>
        {arranging && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={glide}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pb-6">
              <span className="mr-1 text-[14px] font-semibold text-ink-2">{hidden.length ? "Put back:" : "Everything's out."}</span>
              {hidden.map((c) => (
                <motion.button
                  layout
                  key={c.id}
                  onClick={() => setLayout((l) => [...l.filter((x) => x.id !== c.id), { ...c, hidden: false }])}
                  className="rounded-[8px] border-2 border-dashed border-line-strong px-3.5 py-1.5 text-[14px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
                  title={CELL_INFO[c.id].blurb}
                >
                  + {CELL_INFO[c.id].title}
                </motion.button>
              ))}
              <button onClick={() => setLayout(() => DEFAULT_LAYOUT)} className="ml-auto rounded-[8px] px-3 py-1.5 text-[14px] font-semibold text-ink-3 hover:bg-panel hover:text-ink">
                Reset to Dime&apos;s pick
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DndContext
        sensors={sensors}
        collisionDetection={collide}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onStart}
        onDragOver={onOver}
        onDragEnd={onEnd}
        onDragCancel={() => setActive(null)}
      >
        <SortableContext items={shown.map((c) => c.id)}>
          <div className="grid grid-cols-12 gap-6 [grid-auto-flow:row_dense]">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((c) => (
                <Slot key={c.id} cell={c} arranging={arranging} lifted={active?.id === c.id} onSize={(size) => update(c.id, { size })} onHide={() => update(c.id, { hidden: true })} />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" }}>
          {active && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: 1.03, rotate: -1.2 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="pointer-events-none rounded-[14px] shadow-lift"
              style={{ width: active.w, minHeight: active.h }}
            >
              <div className="h-full">{RENDER[active.id]()}</div>
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>
    </LayoutGroup>
  );
}

function Slot({
  cell,
  arranging,
  lifted,
  onSize,
  onHide,
}: {
  cell: Cell;
  arranging: boolean;
  lifted: boolean;
  onSize: (s: Size) => void;
  onHide: () => void;
}) {
  const { setNodeRef, attributes, listeners } = useSortable({ id: cell.id, disabled: !arranging });
  const info = CELL_INFO[cell.id];
  return (
    <motion.div
      ref={setNodeRef}
      layout="position"
      layoutId={`cell-${cell.id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={glide}
      className={`relative ${SPAN_CLASS[cell.size]} ${info.tall ? "xl:row-span-2" : ""} ${arranging ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      {...(arranging ? { ...attributes, ...listeners } : {})}
      aria-roledescription={arranging ? "movable card" : undefined}
      aria-label={arranging ? `${info.title}. Drag to move.` : undefined}
    >
      <div className={`h-full transition-opacity duration-200 ${lifted ? "opacity-0" : ""} ${arranging ? "pointer-events-none select-none" : ""}`}>{RENDER[cell.id]()}</div>

      {/* Where the lifted card came from */}
      {lifted && <div className="absolute inset-0 rounded-[14px] border-[2.5px] border-dashed border-ink-3/60 bg-panel/40" />}

      <AnimatePresence>
        {arranging && !lifted && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 rounded-[14px] ring-[2.5px] ring-ink/70 ring-offset-0"
          >
            {/* Sits on the card's top edge, clear of the card's own controls. */}
            <div
              className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-[8px] bg-ink p-1 text-[13px] font-semibold text-paper shadow-paper"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {info.sizes.length > 1 &&
                info.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSize(s)}
                    aria-label={`Make it ${SIZE_LABEL[s]} wide`}
                    aria-pressed={cell.size === s}
                    className={`h-7 min-w-7 rounded-[8px] px-2 transition-colors ${cell.size === s ? "bg-paper text-ink" : "hover:bg-white/15"}`}
                  >
                    {SIZE_LABEL[s]}
                  </button>
                ))}
              <button onClick={onHide} className="h-7 rounded-[8px] px-2.5 hover:bg-white/15">
                Hide
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
