"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TabConfig, TabKey } from "@/components/bottom-nav";

type SectionsBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: TabConfig[];
  activeTab: TabKey;
  onSelect: (key: TabKey) => void;
};

export function SectionsBottomSheet({
  open,
  onOpenChange,
  tabs,
  activeTab,
  onSelect,
}: SectionsBottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (open) {
      html.classList.add("modal-open");
      document.body.classList.add("modal-open");
    } else {
      html.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }
    return () => {
      html.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sections-sheet-dim"
            className="fixed inset-0 z-[100] cursor-default bg-black/60 backdrop-blur-[2px]"
            aria-hidden
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[101] flex justify-center px-2 md:px-4 pointer-events-none">
            <motion.div
              key="sections-sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sections-sheet-title"
              className="app-shell pointer-events-auto flex w-full max-h-[min(78dvh,560px)] flex-col rounded-t-3xl border border-border/80 bg-background/98 shadow-[0_-8px_48px_-12px_rgba(0,0,0,0.85)] supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-xl"
              initial={reduceMotion ? { opacity: 0, y: 0 } : { opacity: 1, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : { type: "spring", damping: 32, stiffness: 380 }
              }
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex shrink-0 flex-col border-b border-border/70 bg-secondary/15 px-3 pb-2 pt-2">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border/90" aria-hidden />
              <div className="flex items-center justify-between gap-2">
                <h2 id="sections-sheet-title" className="text-sm font-semibold tracking-tight text-foreground">
                  Разделы
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 p-0"
                  onClick={() => onOpenChange(false)}
                  aria-label="Закрыть"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <ul className="space-y-1" role="list">
                {tabs.map((config) => {
                  const Icon = config.icon;
                  const isActive = activeTab === config.key;
                  return (
                    <li key={config.key}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(config.key);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                          isActive
                            ? "border-primary/45 bg-primary/15 text-foreground"
                            : "border-border/60 bg-secondary/10 text-muted-foreground hover:border-border hover:bg-secondary/20",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/50",
                            isActive && "border-primary/35 bg-primary/10 text-primary",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-foreground">
                          {config.label}
                        </span>
                        {isActive ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
