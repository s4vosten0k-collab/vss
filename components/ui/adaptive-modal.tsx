"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdaptiveModalProps = {
  open: boolean;
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
};

export function AdaptiveModal({
  open,
  onClose,
  header,
  children,
  maxWidthClass = "max-w-5xl",
  contentClassName,
  showCloseButton = true,
}: AdaptiveModalProps) {
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/65 p-1.5 backdrop-blur-sm sm:flex sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mx-auto mt-1 flex h-[92dvh] w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl [-webkit-text-size-adjust:100%] [text-size-adjust:100%] sm:mt-0 sm:h-[min(88dvh,760px)] sm:rounded-2xl",
              maxWidthClass,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-1.5 border-b border-border/80 bg-secondary/20 px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-3">
              <div className="min-w-0 pr-1">{header}</div>
              {showCloseButton && (
                <Button variant="ghost" size="sm" className="self-end sm:self-auto" onClick={onClose} aria-label="Закрыть">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div
              className={cn(
                "min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-y-contain px-1.5 py-2 sm:space-y-4 sm:p-3",
                "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
                contentClassName,
              )}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    ,
    document.body,
  );
}
