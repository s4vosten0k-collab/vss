import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const coreDocuments = [
  "Боевой устав — Приказ МЧС №1 от 31.01.2024",
  "Устав службы — Приказ МЧС №315 от 18.09.2023",
  "Инструкция об организации деятельности ГСВ — Приказ МЧС №88 от 07.04.2020",
  "Правила безопасности в ОПЧС — Приказ МЧС №200 от 16.06.2022 (в редакции приказа МЧС №438 от 29.12.2023)",
  "ФП — Приказ МЧС №366 от 30.11.2022",
  "Трехступенчатый контроль — Приказ МЧС №121 от 17.07.2002",
  "Техника — Приказ МЧС РБ №165 от 15.04.2024",
  "Строевой устав — Приказ МЧС №106 от 05.08.2008",
  "Дисциплинарный устав — Указ Президента РБ №509 от 31.08.1999",
];

function highlightDetails(text: string): ReactNode {
  const parts = text.split(/(№\d+|\d{2}\.\d{2}\.\d{4})/g);

  return parts.map((part, index) => {
    const isHighlighted = /^№\d+$/.test(part) || /^\d{2}\.\d{2}\.\d{4}$/.test(part);
    if (!isHighlighted) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <span
        key={`${part}-${index}`}
        className="mx-0.5 inline-block rounded-md bg-primary/20 px-1.5 py-0.5 font-semibold text-foreground"
      >
        {part}
      </span>
    );
  });
}

function renderDocumentLine(doc: string): ReactNode {
  const [titlePart, ...restParts] = doc.split("—");
  const restText = restParts.join("—").trim();
  const bracketMatch = restText.match(/\(([^)]+)\)\s*$/);
  const bracketText = bracketMatch?.[1]?.trim() ?? "";
  const mainText = bracketMatch ? restText.replace(/\s*\([^)]+\)\s*$/, "").trim() : restText;

  return (
    <div className="min-w-0">
      <p className="mb-1 text-sm font-semibold leading-5 text-card-foreground">{titlePart.trim()}</p>
      {mainText ? <p className="text-xs leading-5 text-muted-foreground">{highlightDetails(mainText)}</p> : null}
      {bracketText ? (
        <p className="mt-1 rounded-md border border-border/70 bg-background/40 px-2 py-1 text-xs leading-5 text-muted-foreground">
          ({highlightDetails(bracketText)})
        </p>
      ) : null}
    </div>
  );
}

export function DocumentsPage() {
  return (
    <section className="space-y-4">
      <Card className="border-primary/25 bg-gradient-to-b from-card to-card/95">
        <CardHeader>
          <CardTitle className="text-base">Основные руководящие документы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {coreDocuments.map((doc) => (
            <div
              key={doc}
              className="rounded-xl border border-primary/20 bg-gradient-to-r from-secondary/35 to-secondary/10 px-3 py-2.5 transition-colors hover:border-primary/45"
            >
              <div className="text-card-foreground/95">
                {renderDocumentLine(doc)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
