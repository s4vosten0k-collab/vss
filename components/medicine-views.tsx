"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DiverMedicineAppendix, DiverMedicineArticle } from "@/lib/diver-medicine-data";

/* ——— block model + parser ——— */

type Block =
  | { k: "p"; text: string }
  | { k: "n"; num: string; text: string }
  | { k: "sub"; mark: string; text: string }
  | { k: "h"; text: string }
  | { k: "ul"; items: string[] }
  | { k: "table"; rows: string[] }
  | { k: "co"; text: string };

const RE_NUM = /^(\d+)\.\s+(.*)$/;
const RE_SUB = /^\s*([a-zA-Zа-яёА-ЯЁ]\))\s*(.+)$/;
const RE_LIST = /^\s*[-•\u2013\u2014]\s*(.+)$/;
const RE_HEAD = /^(Таблица|Примечание)\b.*/i;
const RE_EXAMPLE = /^Пример\.?\s*/i;

function isTableRow(s: string) {
  return s.includes("\t");
}

function tokenizeText(raw: string): Block[] {
  const lines = raw.split(/\n/);
  const blocks: Block[] = [];
  const merge: string[] = [];
  let listBuf: string[] = [];
  let tableBuf: string[] = [];

  const flushMerge = () => {
    if (!merge.length) return;
    const t = merge.join(" ").replace(/\s+/g, " ").trim();
    if (t) blocks.push({ k: "p", text: t });
    merge.length = 0;
  };

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push({ k: "ul", items: [...listBuf] });
    listBuf = [];
  };

  const flushTable = () => {
    if (!tableBuf.length) return;
    blocks.push({ k: "table", rows: [...tableBuf] });
    tableBuf = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushList();
      flushTable();
      flushMerge();
      continue;
    }

    if (isTableRow(t)) {
      flushList();
      flushMerge();
      tableBuf.push(t);
      continue;
    }
    if (tableBuf.length) {
      flushTable();
    }

    if (RE_LIST.test(t) || /^\s*-\s+/.test(line)) {
      flushMerge();
      const m = t.match(RE_LIST) ?? line.match(/^\s*-\s+(.+)$/);
      listBuf.push(m?.[1]?.trim() ?? t);
      continue;
    }
    flushList();

    if (RE_EXAMPLE.test(t) || t.startsWith("Пример ")) {
      flushMerge();
      blocks.push({ k: "co", text: t });
      continue;
    }

    const num = t.match(RE_NUM);
    if (num) {
      flushMerge();
      blocks.push({ k: "n", num: num[1]!, text: num[2] ?? "" });
      continue;
    }

    const sub = t.match(RE_SUB);
    if (sub && !/^\d+\./.test(t)) {
      flushMerge();
      blocks.push({ k: "sub", mark: sub[1]!, text: sub[2]! });
      continue;
    }

    if (RE_HEAD.test(t) && t.length < 90) {
      flushMerge();
      blocks.push({ k: "h", text: t });
      continue;
    }

    merge.push(t);
  }
  flushList();
  flushTable();
  flushMerge();
  return blocks;
}

const PROSE = "text-[13.5px] leading-[1.68] tracking-[0.01em] sm:text-[15px] sm:leading-[1.82]";

const RE_PONIMAI = /(понимают|понимается|понималось|понимались|понимайте|понимали)/i;

function isPodDefinition(s: string) {
  const t = s.trim();
  if (!t.startsWith("Под ")) return false;
  return RE_PONIMAI.test(t.slice(0, 140));
}

function isDefinitionOpen(s: string) {
  const t = s.trim();
  if (t.length < 12 || t.length > 600) return false;
  if (isPodDefinition(t)) return true;
  if (/^Сущность [^.\n]+ заключается /i.test(t)) return true;
  if (/^Патологические [^.\n]+ называ(ют|ется|ются)/i.test(t)) return true;
  if (t.indexOf("представляет собой") >= 0 && t.indexOf("представляет собой") < 120) {
    if (/^[^.!?]{0,95}представляет собой /i.test(t)) return true;
  }
  return false;
}

function sliceDefinition(sentences: string[]): { def: string; rest: string } | null {
  if (sentences.length === 0) return null;
  const first = (sentences[0] ?? "").trim();
  if (!isDefinitionOpen(first)) return null;

  if (isPodDefinition(first)) {
    if (sentences.length >= 2) {
      const s2 = (sentences[1] ?? "").trim();
      return {
        def: `${first} ${s2}`.replace(/\s+/g, " "),
        rest: sentences
          .slice(2)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      };
    }
    return { def: first, rest: sentences.slice(1).join(" ").replace(/\s+/g, " ").trim() };
  }

  return { def: first, rest: sentences.slice(1).join(" ").replace(/\s+/g, " ").trim() };
}

function splitSentences(text: string) {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function DefinitionCallout({
  accent,
  children,
}: {
  accent: "default" | "appendix";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-2 rounded-r-lg border-l-2 pl-2.5 py-2 pr-1 sm:pl-3 sm:py-2.5",
        accent === "appendix"
          ? "border-cyan-400/50 bg-cyan-500/10 text-foreground/95 [box-shadow:inset_0_0_0_1px_rgba(6,182,212,0.12)]"
          : "border-amber-500/55 bg-amber-500/[0.11] text-foreground/95 [box-shadow:inset_0_0_0_1px_rgba(245,158,11,0.1)]"
      )}
    >
      <div className={cn("font-medium [text-rendering:optimizeLegibility]", PROSE)}>{children}</div>
    </div>
  );
}

function TextWithDefinitionCallout({
  text,
  accent,
  sectionSep,
}: {
  text: string;
  accent: "default" | "appendix";
  sectionSep?: boolean;
}) {
  const sentences = splitSentences(text);
  const defSlice = sliceDefinition(sentences);
  const outer = sectionSep
    ? "mb-4 border-b border-border/20 pb-3.5 last:mb-1 last:border-b-0 last:pb-0 sm:mb-5 sm:pb-4 sm:last:mb-2"
    : cn("mb-4 text-foreground/86 last:mb-0 sm:mb-5", PROSE);

  if (defSlice) {
    return (
      <div className={sectionSep ? outer : "mb-4 last:mb-0 sm:mb-5"}>
        <DefinitionCallout accent={accent}>{defSlice.def}</DefinitionCallout>
        {defSlice.rest ? (
          <p
            className={cn(
              "mt-2 font-normal text-foreground/86 [text-rendering:optimizeLegibility] first:mt-0",
              PROSE
            )}
          >
            {defSlice.rest}
          </p>
        ) : null}
      </div>
    );
  }
  if (sectionSep) {
    return (
      <div className={outer}>
        <p className={cn("text-foreground/88 [text-rendering:optimizeLegibility]", PROSE)}>{text}</p>
      </div>
    );
  }
  return <p className={cn(outer, "[text-rendering:optimizeLegibility] first:mt-0")}>{text}</p>;
}

function MedicineProse({ text, accent = "default" }: { text: string; accent?: "default" | "appendix" }) {
  if (!text.trim()) {
    return <p className="text-xs text-muted-foreground sm:text-sm">Нет текста.</p>;
  }
  const blocks = tokenizeText(text);
  const out: ReactNode[] = [];
  const wrapClass =
    accent === "appendix" ? "selection:bg-cyan-500/25" : "selection:bg-primary/20";

  blocks.forEach((b, i) => {
    if (b.k === "p") {
      out.push(<TextWithDefinitionCallout key={`p-${i}`} text={b.text} accent={accent} />);
    } else if (b.k === "n") {
      out.push(<TextWithDefinitionCallout key={`n-${i}`} text={b.text} accent={accent} sectionSep />);
    } else if (b.k === "sub") {
      out.push(
        <div
          key={`s-${i}`}
          className="mb-2.5 border-l-2 border-primary/40 py-0.5 pl-3 sm:pl-4 sm:mb-3.5"
        >
          <p className="text-[13px] leading-[1.7] text-foreground/86 sm:text-[14.5px] sm:leading-[1.76]">
            <span className="mr-1.5 font-semibold text-primary/95">{b.mark}</span>
            {b.text}
          </p>
        </div>
      );
    } else if (b.k === "h") {
      out.push(
        <h4
          key={`h-${i}`}
          className="mb-2.5 mt-5 border-b border-border/30 pb-1 first:mt-0 text-xs font-semibold text-foreground/95 sm:mb-3.5 sm:mt-7 sm:pb-1.5 sm:text-sm"
        >
          {b.text}
        </h4>
      );
    } else if (b.k === "ul") {
      out.push(
        <ul key={`u-${i}`} className="mb-4 space-y-2 last:mb-0 sm:mb-6 sm:space-y-2.5">
          {b.items.map((it, j) => (
            <li
              key={j}
              className="relative pl-3.5 text-[13px] leading-[1.7] text-foreground/86 before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/50 sm:pl-4 sm:text-[14.5px] sm:leading-[1.74]"
            >
              {it}
            </li>
          ))}
        </ul>
      );
    } else if (b.k === "table") {
      out.push(
        <pre
          key={`t-${i}`}
          className="mb-4 max-w-full overflow-x-auto rounded-lg border border-border/45 bg-muted/25 p-2.5 font-mono text-[10px] leading-snug text-foreground/84 tabular-nums last:mb-0 sm:mb-6 sm:rounded-xl sm:p-3.5 sm:text-xs sm:leading-relaxed"
        >
          {b.rows.join("\n")}
        </pre>
      );
    } else if (b.k === "co") {
      out.push(
        <aside
          key={`c-${i}`}
          className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-2.5 text-[13px] font-normal leading-[1.7] text-amber-100/90 last:mb-0 sm:mb-6 sm:rounded-2xl sm:p-3.5 sm:text-[14.5px] sm:leading-[1.75]"
        >
          {b.text}
        </aside>
      );
    }
  });

  return <div className={cn("w-full max-w-[min(100%,65ch)]", wrapClass)}>{out}</div>;
}

type MedTab = "d" | "t" | "p";

const segTabs: { k: MedTab; label: string }[] = [
  { k: "d", label: "Диагностика" },
  { k: "t", label: "Лечение" },
  { k: "p", label: "Профилактика" },
];

function pickArticle(a: DiverMedicineArticle, t: MedTab) {
  if (t === "d") return a.diagnostic;
  if (t === "t") return a.treatment;
  return a.prevention;
}

export function MedicineArticleDetailContent({ item }: { item: DiverMedicineArticle }) {
  const [medTab, setMedTab] = useState<MedTab>("d");

  useEffect(() => {
    setMedTab("d");
  }, [item.id]);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background/90 px-2 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:px-4 sm:py-3">
        <LayoutGroup>
          <div
            className="flex w-full gap-1 rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-1 shadow-sm shadow-black/10 sm:gap-1.5 sm:rounded-3xl sm:p-1.5"
            role="tablist"
            aria-label="Раздел статьи"
          >
            {segTabs.map(({ k, label }) => {
              const isActive = medTab === k;
              return (
                <motion.button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setMedTab(k)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.55 }}
                  className={cn(
                    "group relative z-[1] min-h-10 min-w-0 flex-1 touch-manipulation overflow-hidden rounded-xl text-center sm:min-h-11 sm:rounded-2xl",
                    "box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "z-[2] cursor-default border border-transparent"
                      : "border border-border/70 bg-secondary/20 text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:shadow-md active:translate-y-0",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="medArticleTabPill"
                      className="absolute inset-0.5 rounded-[inherit] border border-primary/50 bg-primary/20 shadow-sm shadow-primary/15 ring-1 ring-primary/20"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-[2] block min-w-0 px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight sm:px-2 sm:py-2 sm:text-xs",
                      isActive ? "text-primary" : "duration-200 group-hover:text-foreground/95",
                    )}
                  >
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
      <div className="px-2 py-3 sm:px-5 sm:py-5">
        <div className="rounded-xl border border-border/40 bg-gradient-to-b from-card/30 to-background/20 px-2.5 py-3 sm:rounded-2xl sm:px-4 sm:py-4.5">
          <MedicineProse text={pickArticle(item, medTab)} accent="default" />
        </div>
      </div>
    </div>
  );
}

export function MedicineAppendixDetailContent({ item }: { item: DiverMedicineAppendix }) {
  return (
    <div className="px-2 py-3 sm:px-5 sm:py-5">
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/35 to-background/0 px-2.5 py-3 sm:rounded-2xl sm:px-4 sm:py-4.5">
        <MedicineProse text={item.content} accent="appendix" />
      </div>
    </div>
  );
}
