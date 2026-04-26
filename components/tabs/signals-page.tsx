"use client";

import Link from "next/link";
import { Eye, Waves, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignalsPage() {
  return (
    <section className="space-y-4">
      <Card className="border-primary/40 bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <CardTitle className="text-base">Сигналы водолазов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="border-border/70 bg-secondary/15">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <Waves className="h-4 w-4 text-primary" />
                </span>
                Условные сигналы
              </CardTitle>
              <CardDescription className="text-xs">Сигналы по сигнальному концу</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/handbook/signals/conditional/"
                className="group inline-flex h-auto w-full items-center justify-center gap-2 whitespace-normal rounded-xl border border-primary/35 bg-primary/10 px-3 py-2.5 text-center text-sm font-medium text-primary transition-all duration-200 hover:border-primary/60 hover:bg-primary/15"
              >
                Открыть таблицу условных сигналов
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-secondary/15">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                  <Eye className="h-4 w-4 text-primary" />
                </span>
                Визуальные сигналы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/handbook/signals/visual/"
                className="group inline-flex h-auto w-full items-center justify-center gap-2 whitespace-normal rounded-xl border border-primary/35 bg-primary/10 px-3 py-2.5 text-center text-sm font-medium text-primary transition-all duration-200 hover:border-primary/60 hover:bg-primary/15"
              >
                Открыть визуальные сигналы
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </section>
  );
}
