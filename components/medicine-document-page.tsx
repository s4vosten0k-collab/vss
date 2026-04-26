"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Stethoscope, ListTree, X } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MedArticle = {
  id: string;
  kind: "article";
  title: string;
  diagnostic: string;
  treatment: string;
  prevention: string;
};

type MedAppendix = {
  id: string;
  kind: "appendix";
  title: string;
  content: string;
};

type MedBlock = MedArticle | MedAppendix;

type MedPayload = {
  diverMedicineBlocks: MedBlock[];
};

const FIELD_CONFIG = [
  { key: "diagnostic" as const, label: "Диагностика" },
  { key: "treatment" as const, label: "Лечение" },
  { key: "prevention" as const, label: "Профилактика" },
];

let medicineDataCache: MedBlock[] | null = null;

function splitIntoParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);
}

function splitChapterContent(text: string) {
  const normalized = text.replace(/\r/g, "");
  const splitByPoints = normalized
    .split(/(?=\n\d{1,3}\.\s)/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  if (splitByPoints.length > 1) {
    return splitByPoints;
  }

  return splitIntoParagraphs(normalized);
}

type MedicineDocumentPageProps = {
  title?: string;
  defaultReturnTo?: string;
};

export function MedicineDocumentPage({
  title = "Справочник болезней",
  defaultReturnTo = "/handbook/?tab=medicine",
}: MedicineDocumentPageProps) {
  const searchParams = useSearchParams();
  const [blocks, setBlocks] = useState<MedBlock[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [focusedFragmentId, setFocusedFragmentId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const focusParam = searchParams.get("focus")?.trim() ?? "";
  const returnToParam = searchParams.get("returnTo")?.trim() ?? "";
  const returnToHref = returnToParam || defaultReturnTo;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (medicineDataCache) {
        setBlocks(medicineDataCache);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/assistant-sources/medicine/medicine-blocks.json", { cache: "force-cache" });
        if (!res.ok) throw new Error("medicine-blocks.json");
        const json = (await res.json()) as MedPayload;
        const list = Array.isArray(json.diverMedicineBlocks) ? json.diverMedicineBlocks : [];
        medicineDataCache = list;
        if (!cancelled) setBlocks(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setBlocks(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!blocks || typeof window === "undefined") return;

    const scrollToTarget = (smooth: boolean) => {
      const container = contentRef.current;
      if (!container) return;

      if (focusParam) {
        const fesc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(focusParam) : focusParam.replace(/"/g, '\\"');
        const focused = container.querySelector<HTMLElement>(`[data-fragment-id="${fesc}"]`);
        if (focused) {
          focused.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
          setFocusedFragmentId(focusParam);
          window.setTimeout(() => {
            setFocusedFragmentId((c) => (c === focusParam ? null : c));
          }, 2800);
          return;
        }
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      let hashId = hash;
      try {
        hashId = decodeURIComponent(hash);
      } catch {
        /* already decoded */
      }
      const esc = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(hashId) : hashId.replace(/"/g, '\\"');
      const chapterTarget = container.querySelector<HTMLElement>(`[data-chapter-id="${esc}"]`);
      if (!chapterTarget) return;
      chapterTarget.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    };

    const timeoutId = window.setTimeout(() => scrollToTarget(false), 90);
    const onHash = () => scrollToTarget(true);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", onHash);
    };
  }, [blocks, focusParam]);

  useEffect(() => {
    if (!isTocOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isTocOpen]);

  const toc = useMemo(() => {
    if (!blocks) return [];
    return blocks.map((b) => ({ id: b.id, title: b.title, kind: b.kind }));
  }, [blocks]);

  return (
    <>
      <Header title={title} />
      <div className="mx-auto min-h-dvh max-w-lg bg-background/95 pb-24">
        <main className="space-y-4 px-4 pb-4 pt-3">
          <div className="rounded-xl border border-border/70 bg-secondary/15 p-3">
            <a
              href="/assistant-sources/medicine/zabolevaniya-vodolaznye.doc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              Оригинал .doc (скачать)
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">
              Текст на странице совпадает с базой ассистента. Переход по ссылке из ответа Павлика ведёт к нужному фрагменту.
            </p>
          </div>

          <div ref={contentRef} className="space-y-3 sm:space-y-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))
              : null}

            {!loading &&
              blocks?.map((block) => {
                if (block.kind === "appendix") {
                  const frags = splitChapterContent(block.content);
                  if (!frags.length) {
                    return (
                      <section
                        key={block.id}
                        data-chapter-id={block.id}
                        className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 p-3"
                      >
                        <h2 className="text-sm font-semibold text-cyan-200/95">{block.title}</h2>
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground sm:text-sm">{block.content}</p>
                      </section>
                    );
                  }
                  return (
                    <section
                      key={block.id}
                      data-chapter-id={block.id}
                      className="rounded-xl border border-cyan-500/35 bg-cyan-950/25 p-3"
                    >
                      <h2 className="text-sm font-semibold text-cyan-200/95">{block.title}</h2>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-cyan-500/80">Приложение</p>
                      <div className="mt-2 space-y-2.5">
                        {frags.map((fragment, idx) => {
                          const fragmentId = `med-app-${block.id}-${idx + 1}`;
                          const isFocused = focusedFragmentId === fragmentId;
                          return (
                            <p
                              key={fragmentId}
                              data-fragment-id={fragmentId}
                              className={cn(
                                "scroll-mt-20 rounded-md px-1.5 py-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6",
                                isFocused && "border border-primary/50 bg-primary/15 text-foreground transition-colors duration-300",
                              )}
                            >
                              {fragment}
                            </p>
                          );
                        })}
                      </div>
                    </section>
                  );
                }

                return (
                  <section
                    key={block.id}
                    data-chapter-id={block.id}
                    className="rounded-xl border border-border/70 bg-secondary/10 p-3"
                  >
                    <h2 className="text-sm font-semibold leading-5 text-card-foreground sm:leading-6">{block.title}</h2>
                    {FIELD_CONFIG.map(({ key, label }) => {
                      const raw = block[key];
                      if (!raw?.trim()) return null;
                      const parts = splitChapterContent(raw);
                      if (!parts.length) return null;
                      return (
                        <div key={key} className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">{label}</p>
                          <div className="mt-1.5 space-y-2.5">
                            {parts.map((fragment, idx) => {
                              const fragmentId = `med-${block.id}-${key}-${idx + 1}`;
                              const isFocused = focusedFragmentId === fragmentId;
                              return (
                                <p
                                  key={fragmentId}
                                  data-fragment-id={fragmentId}
                                  className={cn(
                                    "scroll-mt-20 rounded-md px-1.5 py-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6",
                                    isFocused && "border border-primary/50 bg-primary/15 text-foreground transition-colors duration-300",
                                  )}
                                >
                                  {fragment}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}

            {!loading && !blocks?.length ? (
              <p className="text-sm text-muted-foreground">
                Не удалось загрузить справочник. Выполните сборку: `npm run prebuild` (файл `public/assistant-sources/medicine/medicine-blocks.json`).
              </p>
            ) : null}
          </div>
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto flex w-full max-w-lg items-center justify-end gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
          <Link
            href={returnToHref}
            className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnToParam ? "В диалог" : "Назад"}
          </Link>
          <Button
            type="button"
            onClick={() => setIsTocOpen(true)}
            className="pointer-events-auto h-11 rounded-full px-4 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]"
          >
            <ListTree className="mr-1.5 h-4 w-4" />
            Статьи
          </Button>
        </div>
      </div>

      {isTocOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Список заболеваний">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTocOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-2xl border border-border/80 bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Stethoscope className="h-4 w-4 text-primary" />
                Быстрый переход
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsTocOpen(false)} aria-label="Закрыть">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[58dvh] space-y-1.5 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
              {toc.map((row) => (
                <a
                  key={row.id}
                  href={`#${row.id}`}
                  onClick={() => setIsTocOpen(false)}
                  className="block rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-card-foreground transition-colors hover:border-primary/45 hover:bg-secondary/35"
                >
                  {row.kind === "appendix" ? <span className="text-cyan-500/90">[прил.] </span> : null}
                  {row.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
