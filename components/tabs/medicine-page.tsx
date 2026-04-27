"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, FileSymlink, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { medicineBlockHref } from "@/lib/medicine-path";
import { diverMedicineBlocks, type DiverMedicineArticle } from "@/lib/diver-medicine-data";

function TopicRow({
  stagger,
  title,
  href,
  variant = "default",
}: {
  stagger: number;
  title: string;
  href: string;
  variant?: "default" | "appendix";
}) {
  const isAp = variant === "appendix";
  return (
    <motion.li
      className="list-none"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, delay: stagger * 0.03 }}
    >
      <Link
        href={href}
        className={cn(
          "group touch-manipulation flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isAp
            ? "border-blue-400/25 bg-blue-500/5 hover:-translate-y-[1px] hover:border-blue-300/55 hover:bg-blue-500/10 focus-visible:ring-blue-400/40"
            : "border-primary/20 bg-gradient-to-r from-secondary/35 to-secondary/10 hover:-translate-y-[1px] hover:border-primary/55 hover:from-secondary/55 hover:to-secondary/20 focus-visible:ring-primary/35",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-card-foreground">{title}</span>
        </span>
        <ArrowRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
            isAp ? "text-blue-300/70 group-hover:text-blue-200" : "text-muted-foreground group-hover:text-primary",
          )}
        />
      </Link>
    </motion.li>
  );
}

export function MedicinePage() {
  const articles = diverMedicineBlocks.filter((b): b is DiverMedicineArticle => b.kind === "article");
  const appendices = diverMedicineBlocks.filter((b) => b.kind === "appendix");

  return (
    <div className="space-y-4 pb-0.5 sm:space-y-6 sm:pb-1">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.1] to-transparent px-0.5 pt-0.5 sm:rounded-3xl sm:px-1 sm:pt-1">
        <div
          className="pointer-events-none absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/20 blur-3xl sm:h-28 sm:w-28"
          aria-hidden
        />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl sm:h-20 sm:w-40" aria-hidden />
        <div className="relative px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-5">
          <div className="flex items-center gap-2 text-primary sm:gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 sm:h-10 sm:w-10 sm:rounded-2xl">
              <Stethoscope className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-[17px]">Медицинский справочник</h2>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-primary/75 sm:text-[11px] sm:tracking-[0.14em]">водолазная служба</p>
            </div>
          </div>
        </div>
      </header>

      <Card className="border-primary/25 bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-primary/80 sm:h-5 sm:w-5" strokeWidth={1.75} />
            <CardTitle className="text-base text-primary">Справочник болезней</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <ul className="space-y-2.5">
            {articles.map((a, i) => (
              <TopicRow key={a.id} stagger={i} title={a.title} href={medicineBlockHref(a.id)} />
            ))}
          </ul>
        </CardContent>
      </Card>

      {appendices.length > 0 ? (
        <Card className="border-blue-400/25 bg-gradient-to-br from-slate-900/70 to-slate-900/40">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <FileSymlink className="h-4 w-4 shrink-0 text-blue-300/80 sm:h-5 sm:w-5" strokeWidth={1.75} />
              <CardTitle className="text-base text-blue-300">Методики и приложения</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <ul className="space-y-2.5">
              {appendices.map((ap, i) => (
                <TopicRow key={ap.id} stagger={i} title={ap.title} variant="appendix" href={medicineBlockHref(ap.id)} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
