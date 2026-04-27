"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { DUTY_DETAILS } from "@/lib/duties-data";

type DutiesDetailPageProps = {
  roleId: string;
};

export function DutiesDetailPage({ roleId }: DutiesDetailPageProps) {
  const detail = DUTY_DETAILS[roleId];

  if (!detail) {
    return (
      <>
        <Header title="Обязанности" />
        <div className="app-shell min-h-dvh bg-background/95 pb-24">
          <main className="space-y-4 px-4 pb-4 pt-3">
            <section className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-foreground">
              Раздел не найден.
            </section>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={detail.title} />
      <div className="app-shell min-h-dvh bg-background/95 pb-24">
        <main className="space-y-4 px-4 pb-4 pt-3">
          {detail.sections.map((section) => (
            <section
              key={section.title}
              className={
                section.tone === "blue"
                  ? "rounded-xl border border-blue-400/25 bg-blue-500/10 p-3"
                  : section.tone === "primary"
                    ? "rounded-xl border border-primary/25 bg-primary/10 p-3"
                    : "rounded-xl border border-border/70 bg-secondary/10 p-3"
              }
            >
              <p className="mb-2 text-sm font-semibold text-card-foreground">{section.title}</p>
              <ul className="space-y-2 text-sm text-card-foreground/95">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 leading-5">
                    <span className="mt-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                      ▸
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {detail.notes && detail.notes.length > 0 && (
            <section className="rounded-xl border border-primary/25 bg-primary/10 p-3">
              <p className="mb-2 text-sm font-semibold text-card-foreground">Примечания</p>
              <div className="space-y-2">
                {detail.notes.map((note) => (
                  <p key={note} className="text-xs leading-5 text-card-foreground/95">
                    {note}
                  </p>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="app-shell flex items-center justify-end px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
          <Link
            href="/handbook/?tab=duties"
            className="pointer-events-auto inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-4 text-sm font-medium text-foreground shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </div>
      </div>
    </>
  );
}
