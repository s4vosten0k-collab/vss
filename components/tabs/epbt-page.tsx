"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function EpbtPage() {
  const [data, setData] = useState<EpbtStructuredData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (epbtDataCache) {
        setData(epbtDataCache);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/docs/epbt-structured.json", { cache: "force-cache" });
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

  const chapters = useMemo(() => data?.chapters ?? [], [data]);

  return (
    <>
      <section className="space-y-4 pb-3">
        <Card className="border-border/70 bg-gradient-to-b from-card to-card/95">
          <CardHeader>
            <CardTitle className="text-base">Главы ЕПБТ</CardTitle>
            <CardDescription>
              Откройте ЕПБТ на отдельной странице. Так текст читается стабильнее на телефоне и не ломается внутри модалки.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-5">
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  href="/handbook/epbt/"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/45 bg-primary/15 px-3 text-sm font-semibold text-primary transition-colors hover:border-primary/70 hover:bg-primary/20"
                >
                  Открыть полный ЕПБТ
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="/docs/epbt.doc"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-border/80 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
                >
                  Оригинал .doc
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {loading && (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            )}

            {!loading && chapters.length === 0 && (
              <div className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-foreground">
                Не удалось загрузить главы ЕПБТ. Проверьте файл `public/docs/epbt-structured.json`.
              </div>
            )}

            {!loading &&
              chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/handbook/epbt/#${chapter.id}`}
                  className={cn(
                    "group grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200",
                    chapter.kind === "appendix"
                      ? "border border-primary/35 bg-primary/10 hover:border-primary/55 hover:bg-primary/15"
                      : "border border-border/70 bg-secondary/20 hover:border-primary/45 hover:bg-secondary/35",
                  )}
                >
                  {chapter.kind === "appendix" ? (
                    <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">
                      П{chapter.appendixNumber}
                    </span>
                  ) : (
                    <span className="mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-1 text-xs font-semibold text-primary">
                      {chapter.number}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-card-foreground">{chapter.title}</span>
                    <span className="mt-1 block overflow-hidden text-xs leading-5 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                      {chapter.summary}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
