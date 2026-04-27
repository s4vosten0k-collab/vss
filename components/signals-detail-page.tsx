"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { CONDITIONAL_SIGNALS } from "@/lib/signals-data";

type SignalsDetailPageProps = {
  signalId: string;
};

export function SignalsDetailPage({ signalId }: SignalsDetailPageProps) {
  if (signalId !== "conditional" && signalId !== "visual") {
    return (
      <>
        <Header title="Сигналы" />
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

  const title = signalId === "conditional" ? "Условные сигналы водолазов" : "Визуальные сигналы водолазов";

  return (
    <>
      <Header title={title} />
      <div className="app-shell min-h-dvh bg-background/95 pb-24">
        <main className="space-y-4 px-4 pb-4 pt-3">
          {signalId === "conditional" ? (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-foreground">
                Важно: условные сигналы должны дублироваться (повторяться) для подтверждения приема.
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full table-fixed border-collapse text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-secondary/35">
                      <th className="w-[28%] border border-border px-2 py-2 text-left font-semibold sm:w-[26%]">Сигнал</th>
                      <th className="w-[36%] border border-border px-2 py-2 text-left font-semibold sm:w-[37%]">К водолазу</th>
                      <th className="w-[36%] border border-border px-2 py-2 text-left font-semibold sm:w-[37%]">От водолаза</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONDITIONAL_SIGNALS.map((row) => (
                      <tr key={row.signal} className="align-top odd:bg-background even:bg-secondary/10">
                        <td className="border border-border px-2 py-2 font-medium leading-4 text-card-foreground [overflow-wrap:anywhere] sm:leading-5">
                          {row.signal}
                        </td>
                        <td className="border border-border px-2 py-2 leading-4 text-muted-foreground [overflow-wrap:anywhere] sm:leading-5">
                          {row.toDiver}
                        </td>
                        <td className="border border-border px-2 py-2 leading-4 text-muted-foreground [overflow-wrap:anywhere] sm:leading-5">
                          {row.fromDiver}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Image
                src="/signals/visual-signals-1.png"
                alt="Визуальные сигналы водолазов часть 1"
                width={1200}
                height={900}
                className="h-auto w-full rounded-xl border border-border/70"
              />
              <Image
                src="/signals/visual-signals-2.png"
                alt="Визуальные сигналы водолазов часть 2"
                width={1200}
                height={900}
                className="h-auto w-full rounded-xl border border-border/70"
              />
            </div>
          )}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="app-shell flex items-center justify-end px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
          <Link
            href="/handbook/?tab=signals"
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
