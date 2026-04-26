"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DUTIES_CORE_ROLES, DUTIES_TABULAR_ROLES } from "@/lib/duties-data";

export function DutiesPage() {
  return (
    <section className="space-y-4">
      <Card className="border-primary/25 bg-gradient-to-br from-card to-card/95">
        <CardHeader>
          <CardTitle className="text-base text-primary">Обязанности при работе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {DUTIES_CORE_ROLES.map((role) => (
            <Link
              key={role.id}
              href={`/handbook/duties/${role.id}/`}
              className="group flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-secondary/35 to-secondary/10 px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-primary/55 hover:from-secondary/55 hover:to-secondary/20"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-card-foreground">{role.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-blue-400/25 bg-gradient-to-br from-slate-900/70 to-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-blue-300">Обязанности по табелю Боевого Расчета</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {DUTIES_TABULAR_ROLES.map((role) => (
            <Link
              key={role.id}
              href={`/handbook/duties/${role.id}/`}
              className="group flex w-full items-center gap-3 rounded-2xl border border-blue-400/25 bg-blue-500/5 px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-blue-300/55 hover:bg-blue-500/10"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-card-foreground">{role.title}</span>
              <ArrowRight className="h-4 w-4 text-blue-300/70 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-200" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
