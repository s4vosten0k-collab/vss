"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import { AssistantChatPanel, PavlikAvatar } from "@/components/assistant-chat-panel";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { APP_SHELL_MAX } from "@/lib/app-layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ASSISTANT_NAME = "Павлик";

export function AssistantChatFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const returnTo = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (searchParams.get("tab") !== "assistant") {
      return;
    }
    setOpen(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("tab");
    const q = nextParams.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, searchParams, router]);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        title="Спросить ИИ (Павлик) — останьтесь на странице"
        aria-label="Открыть чат с ИИ-помощником Павлик, чтобы задать вопрос по справочнику"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "fixed z-[45] inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-full p-0 shadow-md",
          "right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:right-4 md:right-6",
          "bg-gradient-to-br from-primary to-orange-500 text-primary-foreground",
          "ring-1 ring-white/20 ring-offset-1 ring-offset-background",
          "transition-[opacity,transform,box-shadow] duration-200 hover:scale-105 hover:shadow-lg active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Bot className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.9} aria-hidden />
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full border border-amber-200/40 bg-gradient-to-b from-amber-200/95 to-amber-400/90 text-amber-950 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          aria-hidden
        >
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.25} />
        </span>
      </Button>

      <AdaptiveModal
        open={open}
        onClose={handleClose}
        maxWidthClass={APP_SHELL_MAX}
        contentClassName="!flex !min-h-0 !flex-1 !flex-col !space-y-0 !overflow-hidden !p-0 !pb-0 sm:!p-0"
        header={
          <div className="flex min-w-0 items-center gap-3">
            <PavlikAvatar size="sm" variant="header" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">{ASSISTANT_NAME}</p>
              <p className="text-xs text-muted-foreground">ИИ-Ассистент</p>
            </div>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AssistantChatPanel returnTo={returnTo} variant="modal" />
        </div>
      </AdaptiveModal>
    </>
  );
}
