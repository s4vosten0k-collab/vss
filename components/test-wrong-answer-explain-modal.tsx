"use client";

import { LoaderCircle } from "lucide-react";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { PavlikAvatar } from "@/components/assistant-chat-panel";
import { Button } from "@/components/ui/button";
import { APP_SHELL_MAX } from "@/lib/app-layout";
import { cn } from "@/lib/utils";

type TestWrongAnswerExplainModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  text: string;
  error: string | null;
  /** Показать подсказку, если агент сработал в запасном режиме. */
  fallback: boolean;
  warning?: string | null;
};

export function TestWrongAnswerExplainModal({
  open,
  onClose,
  loading,
  text,
  error,
  fallback,
  warning,
}: TestWrongAnswerExplainModalProps) {
  return (
    <AdaptiveModal
      open={open}
      onClose={onClose}
      maxWidthClass={APP_SHELL_MAX}
      overlayZClass="z-[130]"
      contentClassName="sm:space-y-3"
      header={
        <div className="flex min-w-0 items-center gap-3 pr-1">
          <PavlikAvatar size="sm" variant="header" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Павлик</p>
            <p className="text-xs text-muted-foreground">Почему ответ неверен</p>
          </div>
        </div>
      }
    >
      <div className="min-h-[120px] space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-sm text-muted-foreground">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center">ИИ формулирует пояснение…</p>
          </div>
        ) : null}

        {!loading && error ? (
          <p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-foreground">{error}</p>
        ) : null}

        {!loading && !error && text ? (
          <>
            {fallback || warning ? (
              <p className="text-[11px] leading-4 text-muted-foreground">
                {warning
                  ? "Не удалось обратиться к нейросети — показан запасной разбор. Детали: "
                  : "Сеть недоступна — показан разбор по материалам теста."}
                {warning ? <span className="text-foreground/80">{warning}</span> : null}
              </p>
            ) : null}
            <div
              className={cn(
                "rounded-2xl border border-border/60 bg-secondary/20 px-3 py-3 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] sm:rounded-xl",
                loading && "pointer-events-none opacity-40",
              )}
            >
              <p className="whitespace-pre-wrap">{text}</p>
            </div>
          </>
        ) : null}

        <Button type="button" className="w-full" onClick={onClose}>
          Понятно
        </Button>
      </div>
    </AdaptiveModal>
  );
}
