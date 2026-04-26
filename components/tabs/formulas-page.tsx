import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FormulaItem = {
  id: string;
  title: string;
  expression: string;
  hint: string;
};

const formulas: FormulaItem[] = [
  {
    id: "(1)",
    title: "Допустимое время пребывания",
    expression: "T = Vp / Q",
    hint: "T — допустимое время пребывания под водой, мин.",
  },
  {
    id: "(2)",
    title: "Рабочий запас воздуха",
    expression: "Vp = Va - Vt - Vz",
    hint: "Vp — рабочий запас воздуха в баллонах, приведенный к нормальному давлению.",
  },
  {
    id: "(3)",
    title: "Количество воздуха в баллонах",
    expression: "Va = V * P",
    hint: "V — суммарная емкость баллонов, P — давление воздуха в баллонах.",
  },
  {
    id: "(4)",
    title: "Поправка на разность температур",
    expression: "Vt = 0.5 * V * (tвозд - tвод)",
    hint: "Учитывает разность температуры воздуха и воды.",
  },
  {
    id: "(5)",
    title: "Неснижаемый запас воздуха",
    expression: "Vz = p * V",
    hint: "p — давление срабатывания указателя минимального давления.",
  },
  {
    id: "(6)",
    title: "Минутный расход воздуха",
    expression: "Q = q * (0.1 * H + 1)",
    hint: "q — легочная вентиляция (л/мин), H — глубина погружения (м).",
  },
];

export function FormulasPage() {
  return (
    <section className="space-y-4">
      <Card className="border-primary/30 bg-gradient-to-b from-card to-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <Calculator className="h-4 w-4 text-primary" />
            </span>
            Формулы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs leading-5 text-foreground">
            Источник: ЕПБТ, Приложение 10 — «Расчет допустимого времени пребывания водолаза под водой».
          </div>

          {formulas.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-card-foreground">
                {item.title} <span className="text-muted-foreground">{item.id}</span>
              </p>
              <p className="mt-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 font-mono text-sm text-foreground">
                {item.expression}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
