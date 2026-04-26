"use client";

import { FormEvent, KeyboardEvent, type ReactNode, useState } from "react";
import { ExternalLink, LoaderCircle, SendHorizontal, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AssistantSource = {
  document: string;
  section?: string;
  point?: string;
  quote?: string;
  url?: string;
  refs?: AssistantSourceRef[];
};

type AssistantSourceRef = {
  section?: string;
  point?: string;
  quote?: string;
  url?: string;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
};

type AssistantApiResponse = {
  answer?: string;
  sources?: AssistantSource[];
  error?: string;
};

const API_ENDPOINT = process.env.NEXT_PUBLIC_ASSISTANT_API_URL?.trim() ?? "http://127.0.0.1:8787/assistant";
const ASSISTANT_NAME = "Максимка";

function withReturnToAssistant(url: string) {
  if (!url) return url;
  const returnTo = "/handbook/?tab=assistant";
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes("returnTo=")) {
    return url;
  }
  return `${url}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

type RichBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "unordered-list"; items: string[] }
  | { kind: "ordered-list"; items: string[] }
  | { kind: "quote"; text: string };

function sanitizeAssistantText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, "$1")
    .replace(/\r/g, "")
    .trim();
}

function renderInlineText(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      parts.push(
        <strong key={`strong-${match.index}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={`code-${match.index}`} className="rounded bg-background/80 px-1 py-0.5 text-[12px] text-primary">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : [text];
}

function parseRichBlocks(rawText: string): RichBlock[] {
  const text = sanitizeAssistantText(rawText);
  const lines = text.split("\n");
  const blocks: RichBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ kind: "heading", text: headingMatch[1].trim() });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      blocks.push({ kind: "quote", text: line.replace(/^>\s?/, "").trim() });
      i += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!/^[-*•]\s+/.test(current)) break;
        items.push(current.replace(/^[-*•]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ kind: "unordered-list", items });
      continue;
    }

    if (/^\d+[\).]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!/^\d+[\).]\s+/.test(current)) break;
        items.push(current.replace(/^\d+[\).]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ kind: "ordered-list", items });
      continue;
    }

    const paragraphLines = [line];
    i += 1;
    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current) {
        i += 1;
        break;
      }
      if (/^#{1,3}\s+/.test(current) || /^>\s?/.test(current) || /^[-*•]\s+/.test(current) || /^\d+[\).]\s+/.test(current)) {
        break;
      }
      paragraphLines.push(current);
      i += 1;
    }

    const paragraphText = paragraphLines.join(" ");
    const sentenceParts = paragraphText
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (sentenceParts.length >= 3 && paragraphText.length > 240) {
      for (let sentenceIndex = 0; sentenceIndex < sentenceParts.length; sentenceIndex += 2) {
        const chunk = sentenceParts.slice(sentenceIndex, sentenceIndex + 2).join(" ").trim();
        if (chunk) {
          blocks.push({ kind: "paragraph", text: chunk });
        }
      }
    } else {
      blocks.push({ kind: "paragraph", text: paragraphText });
    }
  }

  return blocks;
}

function renderTextWithLinks(text: string) {
  const blocks = parseRichBlocks(text);

  if (!blocks.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6 text-card-foreground">{text}</p>;
  }

  return (
    <div className="space-y-2 text-[13px] font-normal leading-[1.65] tracking-[0.002em] text-card-foreground sm:space-y-2.5 sm:text-[14px] sm:leading-6">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <p key={`heading-${index}`} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[12.5px] font-semibold leading-5 text-foreground sm:text-[13px] sm:leading-5">
              {renderInlineText(block.text)}
            </p>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote key={`quote-${index}`} className="border-l-2 border-primary/50 pl-2.5 text-[13px] leading-6 text-muted-foreground sm:text-[13.5px]">
              {renderInlineText(block.text)}
            </blockquote>
          );
        }

        if (block.kind === "unordered-list") {
          return (
            <ul key={`ul-${index}`} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${itemIndex}`} className="flex items-start gap-2">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                  <span className="text-[13px] leading-6 sm:text-[14px]">{renderInlineText(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "ordered-list") {
          return (
            <ol key={`ol-${index}`} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${itemIndex}`} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                    {itemIndex + 1}
                  </span>
                  <span className="text-[13px] leading-6 sm:text-[14px]">{renderInlineText(item)}</span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${index}`} className="whitespace-pre-wrap text-[13px] leading-6 sm:text-[14px] sm:leading-6">
            {renderInlineText(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function DiverAvatar({ loading = false }: { loading?: boolean }) {
  return (
    <div
      className={cn(
        "mt-0.5 shrink-0 rounded-full border border-primary/35 bg-primary/10 p-3 text-base leading-none shadow-[0_0_0_1px_rgba(249,115,22,0.08)]",
        loading && "animate-pulse",
      )}
      aria-hidden="true"
    >
      <span className="text-[26px] leading-none">👮</span>
    </div>
  );
}

export function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [selectedSource, setSelectedSource] = useState<AssistantSource | null>(null);

  const sendQuestion = async (rawQuestion: string) => {
    const trimmedQuestion = rawQuestion.trim();
    if (!trimmedQuestion || isLoading) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          question: trimmedQuestion,
          domain: "mchs_rb",
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Сервис вернул не JSON-ответ. Проверьте API endpoint.");
      }

      const data = (await response.json()) as AssistantApiResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || "Сервис помощника вернул ошибку.");
      }

      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.answer || "Нет ответа от сервиса помощника.",
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorText =
        error instanceof Error && error.name === "AbortError"
          ? "Время ожидания ответа истекло (25 секунд). Проверьте доступность API."
          : error instanceof Error
            ? error.message
            : "Не удалось получить ответ помощника.";
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: `Ошибка: ${errorText}`,
        },
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
    }
  };

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendQuestion(question);
  };

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading && question.trim()) {
        void sendQuestion(question);
      }
    }
  };

  return (
    <section className="relative space-y-4 overflow-hidden pb-1">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
        animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-28 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
        animate={{ opacity: [0.2, 0.45, 0.2], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-secondary/40 via-secondary/20 to-background/90 backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/30 bg-primary/15 p-3">
              <span className="block text-[34px] leading-none">👮</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{ASSISTANT_NAME}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Пока я могу отвечать только на вопросы по ЕПБТ. Но мой создатель уже работает над тем, чтобы совсем скоро
                я отвечал на все вопросы, которые касаются Службы.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-background/25 p-2.5 backdrop-blur-sm sm:p-3">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex", isAssistant ? "justify-start" : "justify-end")}
            >
              <Card
                className={cn(
                  "w-full border backdrop-blur-md",
                  isAssistant
                    ? "max-w-full border-border/70 bg-gradient-to-b from-secondary/35 via-secondary/20 to-secondary/5 shadow-[0_12px_28px_-22px_rgba(249,115,22,0.5)]"
                    : "max-w-[96%] border-primary/25 bg-primary/10 shadow-[0_10px_24px_-20px_rgba(249,115,22,0.65)] sm:max-w-[88%]",
                )}
              >
                <CardContent className="space-y-2.5 p-3.5 sm:space-y-3 sm:p-4">
                  <div className="flex items-start gap-2.5">
                    {isAssistant ? (
                      <DiverAvatar />
                    ) : (
                      <div className="mt-0.5 shrink-0 rounded-full border border-border/70 bg-background/70 p-1.5">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {isAssistant ? (
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-primary/95">{ASSISTANT_NAME}</span>
                          <span className="h-1 w-1 rounded-full bg-primary/60" />
                          <span className="text-[11px] text-muted-foreground">помощник</span>
                        </div>
                      ) : null}
                      {renderTextWithLinks(message.text)}
                    </div>
                  </div>

                  {isAssistant && message.sources?.length ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2"
                    >
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/90">Источники</p>
                      <div className="grid gap-1.5">
                        {message.sources
                          .filter((source) => Boolean(source.url))
                          .slice(0, 4)
                          .map((source, index) => (
                            <button
                              key={`${source.document}-${index}`}
                              type="button"
                              onClick={() => setSelectedSource(source)}
                              className="rounded-md border border-primary/35 bg-background/70 px-2 py-1 text-[11px] leading-4 text-primary/95 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/20"
                            >
                              <span className="font-semibold">{source.document}</span>
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {isLoading ? (
          <Card className="w-full max-w-[94%] border-border/70 bg-secondary/20 backdrop-blur-md sm:max-w-[88%]">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2.5">
                <DiverAvatar loading />
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold text-primary">{ASSISTANT_NAME}</p>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-card-foreground shadow-[0_0_0_1px_rgba(249,115,22,0.07)]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                    <span>Ныряю в Ваш вопрос с головой 🤿</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="border-primary/20 bg-gradient-to-b from-card/95 to-card/80 shadow-[0_20px_45px_-35px_rgba(0,0,0,0.9)] backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitQuestion} className="space-y-3">
            <label htmlFor="assistant-question" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/90">
              Ваш вопрос
            </label>
            <textarea
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              rows={4}
              placeholder="Например: Какие условия допуска к водолазным спускам и кто проводит медобеспечение?"
              className="w-full resize-y rounded-2xl border border-border/70 bg-background/75 px-3.5 py-2.5 text-sm leading-6 text-foreground outline-none transition duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
            />
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-[0_14px_30px_-18px_rgba(249,115,22,0.9)] transition-transform duration-200 hover:scale-[1.01]"
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Отправка запроса...
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  Спросить помощника
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AdaptiveModal
        open={Boolean(selectedSource)}
        onClose={() => setSelectedSource(null)}
        header={
          <div>
            <p className="text-sm font-semibold text-foreground">Источник ЕПБТ</p>
            <p className="text-xs text-muted-foreground">
              {selectedSource?.section ?? selectedSource?.document ?? "Фрагмент документа"}
              {selectedSource?.point ? ` • ${selectedSource.point}` : ""}
            </p>
          </div>
        }
        maxWidthClass="max-w-2xl"
        contentClassName="space-y-3"
      >
        {selectedSource?.quote ? (
          <div className="rounded-lg border border-border/70 bg-secondary/20 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm leading-6 text-card-foreground">{selectedSource.quote}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Цитата для этого фрагмента недоступна.</p>
        )}

        {selectedSource?.refs?.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">Пункты и главы</p>
            <div className="space-y-2">
              {selectedSource.refs.map((ref, index) => (
                <div key={`ref-${index}`} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">
                    {ref.section ?? "Раздел"}
                    {ref.point ? <span className="ml-1 text-primary/80">• {ref.point}</span> : null}
                  </p>
                  {ref.quote ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{ref.quote}</p> : null}
                  {ref.url ? (
                    <a
                      href={withReturnToAssistant(ref.url)}
                      className="mt-1 inline-flex items-center text-[11px] text-primary underline-offset-2 hover:underline"
                    >
                      Перейти к пункту
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {selectedSource?.url ? (
          <a
            href={withReturnToAssistant(selectedSource.url)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/45 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/70 hover:bg-primary/20"
          >
            Открыть полный документ
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </AdaptiveModal>
    </section>
  );
}
