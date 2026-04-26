"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Bot, ClipboardList, Radio, ScrollText, ShieldAlert } from "lucide-react";
import { BottomNav, type TabConfig, type TabKey } from "@/components/bottom-nav";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tabs: TabConfig[] = [
  { key: "docs", label: "Документы", icon: ScrollText },
  { key: "duties", label: "Обязанности", icon: ClipboardList },
  { key: "callsigns", label: "Позывные", icon: Radio },
  { key: "signals", label: "Сигналы", icon: Activity },
  { key: "assistant", label: "Помощник", icon: Bot },
  { key: "epbt", label: "Епбт", icon: ShieldAlert },
];

export function EpbtEntryPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const handleTabChange = (tab: TabKey) => {
    if (tab === "epbt") {
      router.push("/handbook/epbt/");
      return;
    }
    router.push(`/handbook/?tab=${tab}`);
  };

  return (
    <>
      <Header title="Епбт" />
      <div className="mx-auto min-h-dvh max-w-lg bg-background/95 pb-24">
        <main className="space-y-4 px-4 pb-4 pt-3">
          <Card className="border-primary/25 bg-gradient-to-br from-card to-card/95">
            <CardHeader>
              <CardTitle className="text-base text-primary">Единые правила безопасности труда</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-secondary/20 to-primary/10 p-3">
                <p className="text-sm leading-6 text-card-foreground/95">
                  Единые правила безопасности труда с удобной навигацией по главам и приложениям.
                </p>
              </div>
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Link
                  href="/handbook/epbt/full/"
                  className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-primary/50 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/25 px-4 text-center text-sm font-semibold text-primary transition-all duration-300 hover:-translate-y-[1px] hover:border-primary/80 hover:shadow-[0_10px_24px_-14px_rgba(249,115,22,0.9)]"
                >
                  {!prefersReducedMotion && (
                    <span
                      className="pointer-events-none absolute inset-y-0 left-[-35%] w-[30%] -skew-x-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                      style={{ animation: "menu-shimmer 1.9s linear infinite" }}
                      aria-hidden="true"
                    />
                  )}
                  <span>Читать</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </main>
      </div>
      <BottomNav tabs={tabs} activeTab="epbt" onChange={handleTabChange} />
    </>
  );
}
