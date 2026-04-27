"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { RuleCitationText } from "@/components/rule-citation-text";
import { TestWrongAnswerExplainModal } from "@/components/test-wrong-answer-explain-modal";
import { fetchTestWrongExplain } from "@/lib/assistant-test-explain";
import { APP_SHELL_MAX } from "@/lib/app-layout";
import { cn } from "@/lib/utils";
import vssTests from "@/lib/vss-tests-90.json";

type VssItem = (typeof vssTests.items)[number] & {
  multiSelect?: boolean;
  correctIndices?: number[];
};
type ViewMode = "default" | "verify" | "revealAll";

const ALL_ITEMS = vssTests.items as VssItem[];
const QUIZ_SIZE = 10;

function isVssMultiSelect(item: VssItem): item is VssItem & { correctIndices: number[] } {
  return item.multiSelect === true && Array.isArray(item.correctIndices) && item.correctIndices.length > 0;
}

function getCorrectIndexSet(item: VssItem): number[] {
  if (isVssMultiSelect(item)) return item.correctIndices;
  return [item.correctIndex];
}

/** Номера вариантов «1, 2, 3» для подписи в режиме «Все ответы» */
function correctOptionNumbersLabel(item: VssItem): string {
  const set = getCorrectIndexSet(item);
  if (set.length === 0) return "";
  return set.map((i) => i + 1).join(", ");
}

function indexSetsEqual(selected: number[], expected: number[]): boolean {
  if (selected.length !== expected.length) return false;
  const a = [...selected].sort((x, y) => x - y);
  const b = [...expected].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

/** Подготовка текста варианта: своя нумерация в UI, без хвостов «;» из Word */
function formatOptionDisplay(text: string): string {
  let s = text.replace(/^\d+[\.)][\s\u00A0]+/, "").trim();
  s = s.replace(/[;；]+$/u, "").trim();
  return s;
}

function shufflePickN(items: VssItem[], n: number): VssItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function knowledgeLevel(correct: number, total: number): { label: string; description: string } {
  const p = (correct / total) * 100;
  if (p >= 100)
    return { label: "Отлично", description: "Полный набор — теория усвоена на высоком уровне." };
  if (p >= 80) return { label: "Очень хорошо", description: "Сильный уровень, мелкие пробелы можно подтянуть." };
  if (p >= 60) return { label: "Хорошо", description: "База в целом есть, стоит повторить спорные темы." };
  if (p >= 40) return { label: "Удовлетворительно", description: "Много пробелов — рекомендуем систематически пройти материал." };
  return { label: "Нужна подготовка", description: "Низкий уровень знаний — ориентируйтесь на полный разбор ЕПБТ и практику." };
}

export function TestsPage() {
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [quizItems, setQuizItems] = useState<VssItem[]>([]);
  const [quizRunId, setQuizRunId] = useState(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"answering" | "feedback">("answering");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [aiExplainOpen, setAiExplainOpen] = useState(false);
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const [aiExplainText, setAiExplainText] = useState("");
  const [aiExplainError, setAiExplainError] = useState<string | null>(null);
  const [aiExplainFallback, setAiExplainFallback] = useState(false);
  const [aiExplainWarning, setAiExplainWarning] = useState<string | null>(null);
  const explainAbortRef = useRef<AbortController | null>(null);
  const explainDedupeKeyRef = useRef<string | null>(null);

  const startNewQuiz = useCallback(() => {
    setQuizItems(shufflePickN(ALL_ITEMS, QUIZ_SIZE));
    setQuizRunId((r) => r + 1);
    setStep(0);
    setPhase("answering");
    setSelectedIndex(null);
    setSelectedIndices([]);
    setCorrectCount(0);
    setFinished(false);
    explainDedupeKeyRef.current = null;
  }, []);

  useEffect(() => {
    if (verifyOpen) {
      startNewQuiz();
    }
  }, [verifyOpen, startNewQuiz]);

  useEffect(() => {
    if (!verifyOpen) {
      explainAbortRef.current?.abort();
      setAiExplainOpen(false);
      setAiExplainLoading(false);
      setAiExplainText("");
      setAiExplainError(null);
      setAiExplainFallback(false);
      setAiExplainWarning(null);
      explainDedupeKeyRef.current = null;
    }
  }, [verifyOpen]);

  const handleWrongAnswer = useCallback(
    (ctx: { item: VssItem; selectedIndex: number | null; selectedIndices: number[]; multi: boolean }) => {
      const { item, selectedIndex, selectedIndices, multi } = ctx;
      const dedupKey = `${quizRunId}-${step}-${item.id}`;
      if (explainDedupeKeyRef.current === dedupKey) {
        return;
      }
      explainDedupeKeyRef.current = dedupKey;

      explainAbortRef.current?.abort();
      const ac = new AbortController();
      explainAbortRef.current = ac;

      setAiExplainOpen(true);
      setAiExplainLoading(true);
      setAiExplainText("");
      setAiExplainError(null);
      setAiExplainFallback(false);
      setAiExplainWarning(null);

      const correctIndices = isVssMultiSelect(item) ? item.correctIndices : [item.correctIndex];
      const selectedForPayload = multi
        ? [...selectedIndices].sort((a, b) => a - b)
        : selectedIndex !== null
          ? [selectedIndex]
          : [];

      if (selectedForPayload.length === 0) {
        setAiExplainLoading(false);
        setAiExplainError("Не удалось определить ваш выбор.");
        return;
      }

      const payload = {
        question: item.question,
        options: item.options.map((o) => formatOptionDisplay(o)),
        correctIndices: [...correctIndices].sort((a, b) => a - b),
        selectedIndices: selectedForPayload,
        note: item.note?.trim() || undefined,
      };

      void fetchTestWrongExplain(payload, ac.signal)
        .then((r) => {
          if (ac.signal.aborted) return;
          setAiExplainText(r.answer);
          setAiExplainFallback(!!r.fallback);
          setAiExplainWarning(r.warning?.trim() || null);
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === "AbortError") return;
          const msg = e instanceof Error ? e.message : "Не удалось получить пояснение.";
          setAiExplainError(msg);
        })
        .finally(() => {
          if (!ac.signal.aborted) {
            setAiExplainLoading(false);
          }
        });
    },
    [quizRunId, step],
  );

  const current = quizItems[step];
  const isMulti = Boolean(current && isVssMultiSelect(current));
  const isCorrect = (() => {
    if (!current) return false;
    if (isVssMultiSelect(current)) {
      return indexSetsEqual(selectedIndices, current.correctIndices);
    }
    return selectedIndex !== null && selectedIndex === current.correctIndex;
  })();

  const handleSelectOption = (idx: number) => {
    if (phase !== "answering" || !current) return;
    if (isVssMultiSelect(current)) return;
    setSelectedIndex(idx);
    setPhase("feedback");
    if (idx === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleToggleMulti = (idx: number) => {
    if (phase !== "answering" || !current || !isVssMultiSelect(current)) return;
    setSelectedIndices((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  };

  const handleSubmitMulti = () => {
    if (phase !== "answering" || !current || !isVssMultiSelect(current)) return;
    if (selectedIndices.length === 0) return;
    setPhase("feedback");
    if (indexSetsEqual(selectedIndices, current.correctIndices)) {
      setCorrectCount((c) => c + 1);
    }
  };

  const goNext = () => {
    if (step + 1 >= QUIZ_SIZE) {
      setFinished(true);
      return;
    }
    setStep((s) => s + 1);
    setPhase("answering");
    setSelectedIndex(null);
    setSelectedIndices([]);
  };

  return (
    <section className="space-y-4">
      <Card className="border-primary/35 bg-gradient-to-br from-card via-card to-primary/10">
        <CardHeader>
          <CardTitle className="text-base">Тесты ВСС (90 вопросов, 2024)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs leading-5 text-foreground">
            Ограничения по времени нет, думай не спеша.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" className="w-full sm:min-w-[200px] sm:flex-1" onClick={() => setVerifyOpen(true)}>
              Проверить знания
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:min-w-[200px] sm:flex-1" onClick={() => setAllOpen(true)}>
              Все ответы
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdaptiveModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        maxWidthClass={APP_SHELL_MAX}
        contentClassName="px-3 sm:px-3"
        header={
          <div className="w-full">
            {!finished && current && (
              <p className="text-xs text-muted-foreground">
                Вопрос {step + 1} из {QUIZ_SIZE}
              </p>
            )}
            <p className="text-sm font-semibold text-foreground">
              {finished ? "Результат" : "Проверка знаний"}
            </p>
          </div>
        }
      >
        <div className="pb-2">
          {finished ? (
            <ResultsScreen
              correct={correctCount}
              total={QUIZ_SIZE}
              onClose={() => setVerifyOpen(false)}
              onRetry={() => startNewQuiz()}
            />
          ) : current ? (
            <PddStyleQuestion
              item={current}
              stepIndex={step}
              totalSteps={QUIZ_SIZE}
              phase={phase}
              multi={isMulti}
              selectedIndex={selectedIndex}
              selectedIndices={selectedIndices}
              isCorrect={!!isCorrect}
              onSelect={handleSelectOption}
              onToggleMulti={handleToggleMulti}
              onSubmitMulti={handleSubmitMulti}
              onNext={goNext}
              onWrongAnswer={handleWrongAnswer}
            />
          ) : null}
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        open={allOpen}
        onClose={() => setAllOpen(false)}
        maxWidthClass={APP_SHELL_MAX}
        header={
          <div>
            <p className="text-sm font-semibold text-foreground">Все ответы</p>
            <p className="text-xs text-muted-foreground">
              Всего {ALL_ITEMS.length} вопросов · в части вопросов верных вариантов несколько
            </p>
          </div>
        }
        contentClassName="sm:space-y-3"
      >
        <div className="space-y-3 pb-2">
          {ALL_ITEMS.map((q) => (
            <TestQuestionBlock
              key={q.id}
              item={q}
              meta={`Вопрос ${q.n}`}
              picked={null}
              onPick={() => {}}
              viewMode="revealAll"
              readOnly
            />
          ))}
        </div>
      </AdaptiveModal>

      <TestWrongAnswerExplainModal
        open={aiExplainOpen}
        onClose={() => {
          explainAbortRef.current?.abort();
          setAiExplainOpen(false);
        }}
        loading={aiExplainLoading}
        text={aiExplainText}
        error={aiExplainError}
        fallback={aiExplainFallback}
        warning={aiExplainWarning}
      />
    </section>
  );
}

function ResultsScreen({
  correct,
  total,
  onClose,
  onRetry,
}: {
  correct: number;
  total: number;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { label, description } = knowledgeLevel(correct, total);
  const pct = Math.round((correct / total) * 100);

  return (
    <div className="space-y-4 text-center">
      <div
        className={cn(
          "rounded-2xl border-2 p-4",
          correct === total
            ? "border-emerald-500/50 bg-emerald-500/10"
            : "border-primary/30 bg-primary/5",
        )}
      >
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {correct} / {total}
        </p>
        <p className="text-sm text-muted-foreground">верных ответов ({pct}%)</p>
        <p className="mt-2 text-base font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" onClick={onClose}>
          Закрыть
        </Button>
        <Button type="button" onClick={onRetry}>
          Пройти снова
        </Button>
      </div>
    </div>
  );
}

function PddStyleQuestion({
  item,
  stepIndex,
  totalSteps,
  phase,
  multi,
  selectedIndex,
  selectedIndices,
  isCorrect,
  onSelect,
  onToggleMulti,
  onSubmitMulti,
  onNext,
  onWrongAnswer,
}: {
  item: VssItem;
  stepIndex: number;
  totalSteps: number;
  phase: "answering" | "feedback";
  multi: boolean;
  selectedIndex: number | null;
  selectedIndices: number[];
  isCorrect: boolean;
  onSelect: (idx: number) => void;
  onToggleMulti: (idx: number) => void;
  onSubmitMulti: () => void;
  onNext: () => void;
  onWrongAnswer?: (ctx: {
    item: VssItem;
    selectedIndex: number | null;
    selectedIndices: number[];
    multi: boolean;
  }) => void;
}) {
  const showFeedback = phase === "feedback" && (multi || selectedIndex !== null);
  const correctSet = getCorrectIndexSet(item);
  const progress = Math.max(0, Math.min(100, ((stepIndex + 1) / totalSteps) * 100));
  const onWrongRef = useRef(onWrongAnswer);
  onWrongRef.current = onWrongAnswer;

  useEffect(() => {
    if (!showFeedback || isCorrect) {
      return;
    }
    onWrongRef.current?.({ item, selectedIndex, selectedIndices, multi });
  }, [showFeedback, isCorrect, item, selectedIndex, selectedIndices, multi]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="min-w-0" aria-hidden>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
          <div
            className="h-full rounded-full bg-primary/90 transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card
        className={cn(
          "min-w-0 border-2 shadow-sm transition-colors duration-300",
          "rounded-2xl",
          showFeedback && isCorrect && "border-emerald-500/70 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.2)]",
          showFeedback && !isCorrect && "border-destructive/45 bg-destructive/[0.06]",
        )}
      >
        <CardHeader className="min-w-0 space-y-0 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
          <CardTitle
            className={cn(
              "text-base font-medium leading-7 [overflow-wrap:anywhere] sm:text-sm sm:leading-relaxed",
              showFeedback && isCorrect && "text-emerald-900 dark:text-emerald-100",
            )}
          >
            <span className="block not-italic">
              <RuleCitationText
                text={item.question}
                className="block [overflow-wrap:anywhere]"
                mainClassName="[overflow-wrap:anywhere]"
                citationClassName="font-normal"
              />
            </span>
          </CardTitle>
          {multi && !showFeedback ? (
            <p className="mt-2 text-xs font-medium text-primary/90">Можно выбрать несколько вариантов</p>
          ) : null}
        </CardHeader>
        <CardContent className="min-w-0 space-y-0 px-4 pb-4 sm:px-5 sm:pb-5">
          <ul className="space-y-2.5 sm:space-y-2">
            {item.options.map((opt, idx) => {
              const inCorrect = correctSet.includes(idx);
              const isSel = multi ? selectedIndices.includes(idx) : selectedIndex === idx;
              const isRight = inCorrect;
              const body = formatOptionDisplay(opt);
              const feedbackModeClass = (() => {
                if (!showFeedback) return "";
                if (isRight) {
                  return "border-2 border-emerald-500/80 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50";
                }
                if (isSel) {
                  return cn(
                    "border-2 !border-destructive bg-destructive/20 text-foreground",
                    "ring-2 ring-destructive/70 ring-offset-2 ring-offset-card",
                  );
                }
                return "border-2 border-border/60 text-foreground/80 opacity-80";
              })();
              return (
                <li key={`${item.id}-opt-${idx}`} className="min-w-0">
                  <button
                    type="button"
                    disabled={showFeedback}
                    onClick={() => (multi ? onToggleMulti(idx) : onSelect(idx))}
                    className={cn(
                      "h-auto w-full min-h-[3rem] min-w-0 active:scale-[0.99] sm:min-h-[2.75rem]",
                      "whitespace-normal break-words rounded-2xl px-3.5 py-3.5 text-left [overflow-wrap:anywhere] sm:rounded-xl sm:px-3 sm:py-3",
                      "text-[15px] leading-snug sm:text-sm",
                      "transition-[transform,colors] duration-150",
                      !showFeedback && !multi && "border-2 border-border/90 bg-card shadow-sm hover:border-primary/50 hover:shadow",
                      !showFeedback &&
                        multi &&
                        (isSel
                          ? "border-2 border-primary/70 bg-primary/10 shadow-sm ring-1 ring-primary/30"
                          : "border-2 border-border/90 bg-card shadow-sm hover:border-primary/50 hover:shadow"),
                      showFeedback && feedbackModeClass,
                    )}
                    aria-pressed={multi && !showFeedback ? isSel : undefined}
                  >
                    <span className="flex w-full min-w-0 items-start gap-3 sm:gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 min-w-6 shrink-0 select-none items-center justify-center",
                          multi && !showFeedback && isSel
                            ? "rounded-md bg-primary/25 text-xs font-bold tabular-nums text-primary"
                            : "rounded-md bg-secondary/80 text-xs font-bold tabular-nums text-foreground/80",
                        )}
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-left leading-snug">
                        <RuleCitationText text={body} className="block" mainClassName="[overflow-wrap:anywhere]" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {multi && !showFeedback && (
        <Button
          type="button"
          className="h-12 w-full text-base sm:h-10 sm:text-sm"
          onClick={onSubmitMulti}
          disabled={selectedIndices.length === 0}
        >
          Проверить ответ
        </Button>
      )}

      {showFeedback && isCorrect && (
        <div className="space-y-2.5 pt-0.5">
          <p className="text-center text-base font-semibold text-emerald-600 sm:text-sm dark:text-emerald-400">Верно</p>
          <Button type="button" className="h-12 w-full text-base sm:h-10 sm:text-sm" onClick={onNext}>
            Далее
          </Button>
        </div>
      )}

      {showFeedback && !isCorrect && (
        <div className="space-y-3.5">
          {item.note ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-left text-[15px] leading-6 text-foreground sm:rounded-xl sm:text-xs sm:leading-5">
              <RuleCitationText text={item.note} className="block" mainClassName="[overflow-wrap:anywhere]" />
            </div>
          ) : null}
          <Button type="button" className="h-12 w-full text-base sm:h-10 sm:text-sm" onClick={onNext}>
            Я всё понял
          </Button>
        </div>
      )}
    </div>
  );
}

type TestQuestionBlockProps = {
  item: VssItem;
  meta: string;
  picked: number | null;
  onPick: (index: number) => void;
  viewMode: ViewMode;
  readOnly?: boolean;
};

function TestQuestionBlock({ item, meta, picked, onPick, viewMode, readOnly }: TestQuestionBlockProps) {
  const inVerify = viewMode === "verify";
  const showVerifyResult = inVerify && picked !== null;
  const correctSet = getCorrectIndexSet(item);
  const correct = picked !== null && correctSet.includes(picked);

  const isMulti = isVssMultiSelect(item);
  const showMultiHint = viewMode === "revealAll" && isMulti;

  return (
    <Card className="border-border/70 bg-secondary/10">
        <CardHeader className="space-y-1 pb-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{meta}</p>
        <CardTitle className="text-sm font-medium leading-snug">
          <span className="block not-italic">
            <RuleCitationText
              text={item.question}
              className="block [overflow-wrap:anywhere]"
              mainClassName="[overflow-wrap:anywhere]"
              citationClassName="font-normal"
            />
          </span>
        </CardTitle>
        {showMultiHint ? (
          <p className="pt-1 text-xs font-medium text-primary/90">
            Верные варианты: {correctOptionNumbersLabel(item)} · можно отметить несколько
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {item.options.map((opt, idx) => {
            const isSelected = picked === idx;
            const isCorrectOption = correctSet.includes(idx);
            const isAnswer =
              (viewMode === "revealAll" && isCorrectOption) || (inVerify && isCorrectOption);
            const isWrong = inVerify && picked !== null && isSelected && !isCorrectOption;
            const body = formatOptionDisplay(opt);
            return (
              <li key={idx} className="min-w-0">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onPick(idx)}
                  className={cn(
                    "flex w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    readOnly && "cursor-default",
                    isAnswer && "border-emerald-500/60 bg-emerald-500/10",
                    isWrong && "border-destructive/50 bg-destructive/5",
                    !isAnswer && !isWrong && "border-border/80 bg-card/50 hover:border-primary/40",
                    viewMode === "revealAll" && !isCorrectOption && "opacity-80",
                  )}
                >
                  <span
                    className="shrink-0 select-none font-semibold tabular-nums text-muted-foreground"
                    aria-hidden
                  >
                    {idx + 1}.
                  </span>
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    <RuleCitationText text={body} className="block" mainClassName="[overflow-wrap:anywhere]" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {inVerify && picked === null && !readOnly && (
          <p className="text-xs text-muted-foreground">Ответ не выбран — верный вариант выделен зелёным.</p>
        )}
        {inVerify && showVerifyResult && (
          <span
            className={cn(
              "inline-block text-sm font-medium",
              correct ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300",
            )}
          >
            {correct ? "Верно" : "Неверно — см. пояснение"}
          </span>
        )}
        {(viewMode === "revealAll" || inVerify) && item.note && (
          viewMode === "revealAll" ? (
            <div
              className="rounded-xl border border-primary/50 bg-primary/5 p-3 shadow-sm ring-1 ring-inset ring-primary/20"
              role="note"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {isMulti ? "Правильные ответы — пояснение" : "Правильный ответ — пояснение"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/95 [overflow-wrap:anywhere]">
                <RuleCitationText text={item.note} className="block" mainClassName="[overflow-wrap:anywhere]" />
              </p>
            </div>
          ) : (
            <p
              className={cn(
                "text-xs leading-5 text-muted-foreground border-t border-border/60 pt-3",
                picked !== null && !correct && "text-foreground/90",
              )}
            >
              <RuleCitationText text={item.note} className="block" mainClassName="[overflow-wrap:anywhere]" />
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
