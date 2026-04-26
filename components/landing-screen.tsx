"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function LandingScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-lg items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(30,58,138,0.35),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(249,115,22,0.18),transparent_35%),linear-gradient(180deg,#0b1220_0%,#0e1728_50%,#0b1220_100%)]" />
      <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full border border-white/10" />
      <div className="absolute -right-24 bottom-24 -z-10 h-72 w-72 rounded-full border border-primary/20" />

      <motion.section
        className="w-full rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-center text-[11px] uppercase tracking-[0.22em] text-primary/80">Водолазно-спасательная служба</p>
        <div className="mt-2 flex justify-center">
          <span className="rounded-full border border-primary/35 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">ПАСО Гомель</span>
        </div>
        <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight text-foreground">Памятка водолаза</h1>

        <motion.div whileTap={reduceMotion ? {} : { scale: 0.99 }}>
          <Button className="mt-7 h-12 w-full rounded-xl text-base font-semibold" onClick={() => router.push("/handbook?tab=docs")}>
          Открыть памятку
          </Button>
        </motion.div>
      </motion.section>
    </main>
  );
}
