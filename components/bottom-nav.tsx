"use client";

import { useState } from "react";
import { LayoutGrid, type LucideIcon } from "lucide-react";
import { SectionsBottomSheet } from "@/components/sections-bottom-sheet";
import { cn } from "@/lib/utils";

export type TabKey =
  | "docs"
  | "duties"
  | "callsigns"
  | "signals"
  | "medicine"
  | "tests"
  | "formulas"
  | "epbt";

export type TabConfig = {
  key: TabKey;
  label: string;
  icon: LucideIcon;
};

type BottomNavProps = {
  tabs: TabConfig[];
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

export function BottomNav({ tabs, activeTab, onChange }: BottomNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        className="mobile-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-transparent pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2"
        aria-label="Навигация по разделам"
      >
        <div className="pointer-events-auto app-shell px-4 md:px-6">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "group flex h-11 min-h-[44px] w-full items-center justify-center gap-2.5 rounded-2xl border px-3",
              "text-sm font-semibold tracking-tight antialiased",
              "border-border/90 bg-gradient-to-b from-secondary to-card text-foreground/95",
              "ring-1 ring-inset ring-white/10",
              "shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_2px_8px_rgba(0,0,0,0.35),0_12px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.35)]",
              "transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out",
              "hover:border-primary/25 hover:from-secondary hover:to-secondary",
              "hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_3px_10px_rgba(0,0,0,0.4),0_14px_36px_rgba(0,0,0,0.5)]",
              "active:scale-[0.98] motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              sheetOpen && [
                "border-primary/45 from-primary/20 to-primary/5 text-foreground",
                "ring-1 ring-inset ring-primary/25",
                "shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_2px_8px_rgba(249,115,22,0.2),0_8px_28px_rgba(0,0,0,0.5)]",
              ],
            )}
            aria-expanded={sheetOpen}
            aria-label="Открыть список разделов"
            aria-haspopup="dialog"
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                "border-border/60 bg-background/50 text-foreground/85",
                "group-hover:border-border group-hover:bg-background/70 group-hover:text-foreground",
                sheetOpen && "border-primary/40 bg-primary/20 text-primary",
              )}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span
              className={cn("pr-0.5", sheetOpen ? "text-foreground" : "text-foreground/90 group-hover:text-foreground")}
            >
              Разделы
            </span>
          </button>
        </div>
      </nav>

      <SectionsBottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tabs={tabs}
        activeTab={activeTab}
        onSelect={onChange}
      />
    </>
  );
}
