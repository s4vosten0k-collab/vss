"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, ListTree, X } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type EpbtChapter = {
  id: string;
  kind?: "chapter" | "appendix" | "appendix-chapter";
  number: number | null;
  appendixNumber?: number;
  title: string;
  summary: string;
  content: string;
};

type EpbtStructuredData = {
  preface: string;
  chapters: EpbtChapter[];
};

let epbtDataCache: EpbtStructuredData | null = null;

type EpbtDocumentPageProps = {
  title?: string;
  defaultReturnTo?: string;
};

function splitChapterContent(text: string) {
  const normalized = text.replace(/\r/g, "");
  const splitByPoints = normalized
    .split(/(?=\n\d{1,3}\.\s)/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  if (splitByPoints.length > 1) {
    return splitByPoints;
  }

  return normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);
}

export function EpbtDocumentPage({ title = "ЕПБТ", defaultReturnTo = "/handbook/epbt/" }: EpbtDocumentPageProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<EpbtStructuredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [focusedFragmentId, setFocusedFragmentId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const focusParam = searchParams.get("focus")?.trim() ?? "";
  const returnToParam = searchParams.get("returnTo")?.trim() ?? "";
  const returnToHref = returnToParam || defaultReturnTo;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (epbtDataCache) {
        setData(epbtDataCache);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/assistant-sources/epbt/epbt-structured.json", { cache: "force-cache" });
        if (!response.ok) throw new Error("Failed to load EPBT data");
        const json = (await response.json()) as EpbtStructuredData;
        epbtDataCache = json;
        if (!cancelled) setData(json);
      } catch (error) {
        console.error(error);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data || typeof window === "undefined") return;

    const scrollToTarget = (smooth: boolean) => {
      const container = contentRef.current;
      if (!container) return;

      if (focusParam) {
        const focused = container.querySelector<HTMLElement>(`[data-fragment-id="${focusParam}"]`);
        if (focused) {
          focused.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
          setFocusedFragmentId(focusParam);
          window.setTimeout(() => {
            setFocusedFragmentId((current) => (current === focusParam ? null : current));
          }, 2800);
          return;
        }
      }

      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const chapterTarget = container.querySelector<HTMLElement>(`[data-chapter-id="${hash}"]`);
      if (!chapterTarget) return;
      chapterTarget.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    };

    const timeoutId = window.setTimeout(() => scrollToTarget(false), 90);
    const handleHashChange = () => scrollToTarget(true);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [data, focusParam]);

  useEffect(() => {
    if (!isChaptersOpen || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isChaptersOpen]);

  const chapters = useMemo(() => data?.chapters ?? [], [data]);

  return (
    <>
      <Header title={title} />
      <div className="app-shell min-h-dvh bg-background/95 pb-24">
        <main className="space-y-4 px-4 pb-4 pt-3">
          <div className="rounded-xl border border-border/70 bg-secondary/15 p-3">
            <a
              href="/assistant-sources/epbt/epbt.doc"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              Оригинал .doc
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div ref={contentRef} className="space-y-3 sm:space-y-4">
            <section data-chapter-id="preface" className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <FileText className="h-4 w-4" />
                Преамбула
              </p>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ) : !data?.preface ? null : (
                <div className="mt-2 space-y-2.5">
                  {(() => {
                    const frags = splitChapterContent(data.preface);
                    const parts = frags.length > 0 ? frags : [data.preface];
                    return parts.map((fragment, idx) => {
                      const fragmentId = `epbt-preface-${idx + 1}`;
                      const isFocused = focusedFragmentId === fragmentId;
                      return (
                        <p
                          key={fragmentId}
                          data-fragment-id={fragmentId}
                          className={[
                            "whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6",
                            isFocused
                              ? "scroll-mt-20 rounded-md border border-primary/50 bg-primary/15 text-foreground transition-colors duration-300"
                              : "",
                          ].join(" ")}
                        >
                          {fragment}
                        </p>
                      );
                    });
                  })()}
                </div>
              )}
            </section>

            {!loading &&
              chapters.map((chapter) => (
                <section key={chapter.id} data-chapter-id={chapter.id} className="rounded-xl border border-border/70 bg-secondary/10 p-3">
                  <h2 className="text-sm font-semibold leading-5 text-card-foreground sm:leading-6">{chapter.title}</h2>
                  <div className="mt-2 space-y-2.5">
                    {splitChapterContent(chapter.content).map((fragment, fragmentIndex) => {
                      const fragmentId = `epbt-${chapter.id}-${fragmentIndex + 1}`;
                      const isFocused = focusedFragmentId === fragmentId;
                      return (
                        <p
                          key={fragmentId}
                          data-fragment-id={fragmentId}
                          className={[
                            "scroll-mt-20 rounded-md px-1.5 py-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6",
                            isFocused ? "border border-primary/50 bg-primary/15 text-foreground transition-colors duration-300" : "",
                          ].join(" ")}
                        >
                          {fragment}
                        </p>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="app-shell flex items-center justify-end gap-2 px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
          <Link
            href={returnToHref}
            className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnToParam ? "В диалог" : "Назад"}
          </Link>
          <Button
            type="button"
            onClick={() => setIsChaptersOpen(true)}
            className="pointer-events-auto h-11 rounded-full px-4 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]"
          >
            <ListTree className="mr-1.5 h-4 w-4" />
            Главы
          </Button>
        </div>
      </div>

      {isChaptersOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Список глав ЕПБТ">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChaptersOpen(false)} />
          <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 app-shell rounded-t-2xl border border-border/80 bg-background p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Быстрый переход по главам</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsChaptersOpen(false)} aria-label="Закрыть">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[58dvh] space-y-1.5 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
              {chapters.map((chapter) => (
                <a
                  key={chapter.id}
                  href={`#${chapter.id}`}
                  onClick={() => setIsChaptersOpen(false)}
                  className="block rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-card-foreground transition-colors hover:border-primary/45 hover:bg-secondary/35"
                >
                  {chapter.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
