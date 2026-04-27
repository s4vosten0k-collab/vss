"use client";

import { BookOpen, LoaderCircle, Sparkles } from "lucide-react";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { PavlikAvatar, renderTextWithLinks } from "@/components/assistant-chat-panel";
import { Button } from "@/components/ui/button";
import { APP_SHELL_MAX } from "@/lib/app-layout";
import { cn } from "@/lib/utils";

type TestWrongAnswerExplainModalProps = {
  open: boolean;
  /** Любое закрытие: крестик, оверлей, кнопка «Понятно» — в тесте затем след. вопрос. */
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
          <div className="space-y-3">
            {fallback || warning ? (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                {warning
                  ? "Не удалось обратиться к нейросети — показан запасной разбор. Детали: "
                  : "Сеть недоступна — показан разбор по материалам теста."}
                {warning ? <span className="text-foreground/80">{warning}</span> : null}
              </p>
            ) : null}

            <div
              className={cn(
                "overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.08] via-secondary/15 to-card/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
                loading && "pointer-events-none opacity-40",
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/50 bg-primary/5 px-3 py-2.5 sm:px-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/90">Разбор ответа</p>
                  <p className="text-[10px] leading-4 text-muted-foreground">Главное выделено; списки и абзацы — для удобства чтения</p>
                </div>
              </div>

              <div className="px-3 py-4 sm:px-4 sm:py-5">
                <div
                  className={cn(
                    "prose-test-explain text-foreground [overflow-wrap:anywhere]",
                    "[&_.space-y-2]:space-y-3 [&_.space-y-2]:sm:space-y-3.5",
                    "[&_p]:text-[13.5px] [&_p]:leading-[1.65] [&_p]:tracking-[0.01em] sm:[&_p]:text-sm",
                    "[&_strong]:text-foreground [&_strong]:ring-1 [&_strong]:ring-primary/20 [&_strong]:ring-offset-1 [&_strong]:ring-offset-transparent",
                    "[&_blockquote]:border-primary/40 [&_blockquote]:bg-primary/5 [&_blockquote]:py-1",
                    "[&_ul]:my-1 [&_ol]:my-1",
                  )}
                >
                  {renderTextWithLinks(text)}
                </div>
              </div>

              <div className="flex items-start gap-2 border-t border-border/40 bg-background/25 px-3 py-2.5 sm:px-4">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                <p className="text-[10px] leading-4 text-muted-foreground">
                  Используйте разбор как подсказку; окончательно сверяйтесь с ЕПБТ, справочником и программой подготовки.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <Button type="button" className="w-full" disabled={loading} onClick={onClose}>
          Понятно
        </Button>
      </div>
    </AdaptiveModal>
  );
}
