"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileSymlink, Stethoscope } from "lucide-react";
import { AdaptiveModal } from "@/components/ui/adaptive-modal";
import { cn } from "@/lib/utils";
import { diverMedicineBlocks, type DiverMedicineArticle, type DiverMedicineBlock } from "@/lib/diver-medicine-data";

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

/** Основной текст: на телефоне компактнее, на sm+ — как раньше */
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

/**
 * Вынимает визуальный блок «определение» + остаток абзаца.
 * Для «Под … понима(ют/ается)…» в блок входят 1-е и 2-е предложения (связанное уточнение).
 */
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
      <div
        className={cn(
          "font-medium [text-rendering:optimizeLegibility]",
          PROSE
        )}
      >
        {children}
      </div>
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
    accent === "appendix"
      ? "selection:bg-cyan-500/25"
      : "selection:bg-primary/20";

  blocks.forEach((b, i) => {
    if (b.k === "p") {
      out.push(
        <TextWithDefinitionCallout key={`p-${i}`} text={b.text} accent={accent} />
      );
    } else if (b.k === "n") {
      out.push(
        <TextWithDefinitionCallout key={`n-${i}`} text={b.text} accent={accent} sectionSep />
      );
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

/* ——— topic row: без цифр, только заголовок ——— */

type MedTab = "d" | "t" | "p";

const segTabs: { k: MedTab; label: string; short: string }[] = [
  { k: "d", label: "Диагностика", short: "Диагн." },
  { k: "t", label: "Лечение", short: "Леч." },
  { k: "p", label: "Предупреждение", short: "Профил." },
];

function pickArticle(a: DiverMedicineArticle, t: MedTab) {
  if (t === "d") return a.diagnostic;
  if (t === "t") return a.treatment;
  return a.prevention;
}

function TopicRow({
  stagger,
  title,
  onOpen,
  variant = "default",
}: {
  stagger: number;
  title: string;
  onOpen: () => void;
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
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border text-left transition-all duration-300 sm:rounded-2xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isAp
            ? "border-cyan-500/30 bg-gradient-to-br from-cyan-950/45 to-slate-950/50 py-2.5 pl-3 pr-10 hover:border-cyan-400/50 sm:py-3.5 sm:pl-4 sm:pr-12"
            : "border-border/55 bg-gradient-to-br from-slate-900/95 to-slate-950/40 py-2.5 pl-3 pr-10 hover:-translate-y-px hover:border-primary/40 sm:py-3.5 sm:pl-4 sm:pr-12"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0 h-full w-1 rounded-l-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            isAp ? "bg-cyan-400" : "bg-primary"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
            isAp ? "bg-gradient-to-r from-cyan-500/6 to-transparent" : "bg-gradient-to-r from-primary/8 to-transparent"
          )}
        />
        <span className="relative z-[1] block w-full pr-1 text-left text-[13px] font-medium leading-[1.4] text-foreground/95 group-hover:text-foreground sm:text-[15px] sm:leading-snug">
          {title}
        </span>
        <span
          className={cn(
            "absolute right-2.5 top-1/2 z-[1] -translate-y-1/2 text-sm transition-transform duration-300 group-hover:translate-x-0.5 sm:right-3.5 sm:text-base",
            isAp ? "text-cyan-400/80" : "text-muted-foreground group-hover:text-primary/90"
          )}
          aria-hidden
        >
          →
        </span>
      </button>
    </motion.li>
  );
}

export function MedicinePage() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<DiverMedicineBlock | null>(null);
  const [medTab, setMedTab] = useState<MedTab>("d");

  useEffect(() => {
    if (item?.kind === "article") setMedTab("d");
  }, [item?.id, item?.kind]);

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

      <section>
        <div className="mb-2 flex items-center gap-1.5 text-foreground/90 sm:mb-3 sm:gap-2">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary/80 sm:h-4 sm:w-4" strokeWidth={1.75} />
          <h3 className="text-[13px] font-semibold sm:text-sm">Справочник болезней</h3>
        </div>
        <ul className="space-y-2 sm:space-y-2.5">
          {articles.map((a, i) => (
            <TopicRow
              key={a.id}
              stagger={i}
              title={a.title}
              onOpen={() => {
                setItem(a);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      </section>

      {appendices.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center gap-1.5 text-foreground/90 sm:mb-3 sm:gap-2">
            <FileSymlink className="h-3.5 w-3.5 shrink-0 text-cyan-400/90 sm:h-4 sm:w-4" strokeWidth={1.75} />
            <h3 className="text-[13px] font-semibold sm:text-sm">Методики и приложения</h3>
          </div>
          <ul className="space-y-2 sm:space-y-2.5">
            {appendices.map((ap, i) => (
              <TopicRow
                key={ap.id}
                stagger={i}
                title={ap.title}
                variant="appendix"
                onOpen={() => {
                  setItem(ap);
                  setOpen(true);
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <AdaptiveModal
        open={open && item !== null}
        onClose={() => setOpen(false)}
        maxWidthClass="max-w-lg sm:max-w-xl"
        contentClassName="!px-0 !pb-0 !pt-0 sm:!p-0"
        showCloseButton
        header={
          <div>
            <p className="line-clamp-2 pr-0.5 text-[13px] font-semibold leading-snug text-foreground sm:text-sm sm:text-base">
              {item?.title}
            </p>
            {item?.kind === "article" ? (
              <p className="mt-0.5 text-[10px] text-muted-foreground/95 sm:text-[11px]">Прокрутите вниз по разделу</p>
            ) : null}
          </div>
        }
      >
        {item?.kind === "article" ? (
          <div>
            <div className="sticky top-0 z-10 border-b border-border/55 bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 sm:py-2.5">
              <div
                className="flex w-full gap-0.5 rounded-xl bg-muted/45 p-0.5 ring-1 ring-border/50 sm:gap-1 sm:rounded-2xl sm:p-1"
                role="tablist"
                aria-label="Раздел"
              >
                {segTabs.map(({ k, label, short }) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={medTab === k}
                    onClick={() => setMedTab(k)}
                    className={cn(
                      "min-h-9 min-w-0 flex-1 touch-manipulation rounded-lg px-1 py-1.5 text-center text-[10px] font-medium leading-tight transition-all sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-xs",
                      medTab === k
                        ? "bg-card text-foreground shadow ring-1 ring-primary/30"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="px-2 py-3 sm:px-5 sm:py-5">
              <div className="rounded-xl border border-border/40 bg-gradient-to-b from-card/30 to-background/20 px-2.5 py-3 sm:rounded-2xl sm:px-4 sm:py-4.5">
                <MedicineProse text={pickArticle(item, medTab)} accent="default" />
              </div>
            </div>
          </div>
        ) : item?.kind === "appendix" ? (
          <div className="border-t border-border/50 px-2 py-3 sm:px-5 sm:py-5">
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/35 to-background/0 px-2.5 py-3 sm:rounded-2xl sm:px-4 sm:py-4.5">
              <MedicineProse text={item.content} accent="appendix" />
            </div>
          </div>
        ) : null}
      </AdaptiveModal>
    </div>
  );
}
