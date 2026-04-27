"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { MedicineAppendixDetailContent, MedicineArticleDetailContent } from "@/components/medicine-views";
import type { DiverMedicineBlock } from "@/lib/diver-medicine-data";

export function MedicineBlockDetailPage({ block }: { block: DiverMedicineBlock }) {
  return (
    <>
      <Header title={block.title} />
      <div className="app-shell min-h-dvh bg-background/95 pb-24">
        <main className="pb-4 pt-1">
          {block.kind === "article" ? (
            <>
              <p className="px-4 pb-2 text-[10px] text-muted-foreground/95 sm:pb-3 sm:text-[11px]">Прокрутите вниз по разделу</p>
              <MedicineArticleDetailContent item={block} />
            </>
          ) : (
            <MedicineAppendixDetailContent item={block} />
          )}
        </main>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="app-shell flex items-center justify-end px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.8rem)]">
          <Link
            href="/handbook/?tab=medicine"
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
