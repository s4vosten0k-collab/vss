"use client";

import { type WheelEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU_SCROLL_STORAGE_KEY = "bottom-nav-scroll-left";

export type TabKey =
  | "docs"
  | "duties"
  | "callsigns"
  | "signals"
  | "medicine"
  | "tests"
  | "formulas"
  | "epbt"
  | "assistant";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const rawValue = window.sessionStorage.getItem(MENU_SCROLL_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const restored = Number(rawValue);
    if (!Number.isFinite(restored)) {
      return;
    }

    container.scrollLeft = restored;
    if (restored > 20) {
      setShowSwipeHint(false);
    }
  }, []);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(MENU_SCROLL_STORAGE_KEY, String(container.scrollLeft));
    }

    if (container.scrollLeft > 20) {
      setShowSwipeHint(false);
    }
  };

  const handleWheelScroll = (event: WheelEvent<HTMLDivElement>) => {
    if (isCoarsePointer || !scrollRef.current) {
      return;
    }

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      const container = scrollRef.current;
      const canScrollHorizontally = container.scrollWidth > container.clientWidth + 2;
      if (!canScrollHorizontally) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      container.scrollLeft += event.deltaY;
    }
  };

  return (
    <nav
      className={cn(
        "mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 bg-transparent pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 transition-all duration-200",
        isCoarsePointer && "mobile-menu-dock-enter",
      )}
    >
      <div className="mx-auto w-full max-w-lg px-2">
        <div className="rounded-2xl border border-border/80 bg-background/95 px-1.5 pb-1.5 pt-1 shadow-[0_12px_40px_-22px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Разделы</p>
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground/90">
              <ChevronLeft className="h-3 w-3" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  showSwipeHint ? "opacity-100 text-primary/95" : "opacity-55",
                )}
              >
                Свайп влево/вправо
              </span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background/95 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-background/95 to-transparent" />
            <div
              ref={scrollRef}
              onWheel={handleWheelScroll}
              onScroll={handleScroll}
              className="flex gap-1 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:[scrollbar-width:thin] md:[&::-webkit-scrollbar]:block md:[&::-webkit-scrollbar]:h-1"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTab;

                return (
                  <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={cn(
                      "shrink-0 rounded-xl border px-3 py-2 transition-all duration-200",
                      "flex min-w-[108px] items-center gap-2",
                      isActive ? "border-primary/45 bg-primary/20 text-primary" : "border-border/70 bg-secondary/15 text-muted-foreground",
                    )}
                    aria-label={tab.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0")} />
                    <span className="block truncate text-xs font-medium leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
