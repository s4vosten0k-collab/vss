"use client";

import Link from "next/link";
import { Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CALLSIGN_SECTIONS } from "@/lib/callsigns-data";

export function CallsignsPage() {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Позывные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2.5">
            {CALLSIGN_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="rounded-xl border border-primary/25 bg-gradient-to-r from-secondary/25 via-secondary/15 to-secondary/10 px-3 py-3"
              >
                <p className="text-sm font-semibold text-card-foreground">{section.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{section.subtitle}</p>
                <Link
                  href={`/handbook/callsigns/${section.id}/`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90 px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-14px_rgba(249,115,22,0.9)] transition-all hover:from-primary/95 hover:to-primary/80 hover:shadow-[0_12px_28px_-14px_rgba(249,115,22,0.95)] active:scale-[0.99]"
                >
                  <Table2 className="h-4 w-4" />
                  Открыть таблицу
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
