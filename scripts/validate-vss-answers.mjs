/**
 * Эвристическая проверка: ключевой фрагмент выбранного варианта должен
 * встречаться в note (как в банке чаще всего пояснение = верный ответ).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PATH = resolve(import.meta.dirname, "../lib/vss-tests-90.json");
const j = JSON.parse(readFileSync(PATH, "utf8"));

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[;；.…,\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bestOverlapInNote(opt, note) {
  const o = norm(opt);
  const n = norm(note);
  if (n.length < 20 || o.length < 12) return 1;
  for (let len = Math.min(80, o.length); len >= 12; len -= 1) {
    for (let i = 0; i + len <= o.length; i += 1) {
      const frag = o.slice(i, i + len);
      if (n.includes(frag)) return 1;
    }
  }
  // число в варианте и в note
  const numOpt = o.match(/(\d+[,.]?\d*)\s*(%|м|мм|м\/мин|уз|кг|ч|балл|м²|чел)/i);
  if (numOpt && n.includes(numOpt[1].replace(",", "."))) return 0.5;
  return 0;
}

const weak = [];
const multiIssues = [];

for (const q of j.items) {
  if (q.multiSelect && q.correctIndices?.length) {
    for (const idx of q.correctIndices) {
      const opt = q.options[idx] || "";
      const score = bestOverlapInNote(opt, q.note || "");
      if (score < 0.5) {
        multiIssues.push({
          n: q.n,
          id: q.id,
          idx,
          score,
          option: opt.slice(0, 60),
        });
      }
    }
    continue;
  }

  const opt = q.options[q.correctIndex] || "";
  if ((q.note || "").length < 15) {
    weak.push({ n: q.n, id: q.id, reason: "короткое/пустое note", correctIndex: q.correctIndex });
    continue;
  }

  const sc = bestOverlapInNote(opt, q.note);
  if (sc < 0.5) {
    weak.push({
      n: q.n,
      id: q.id,
      reason: "мало пересечения option↔note",
      correctIndex: q.correctIndex,
      score: sc,
      option: opt.slice(0, 70),
    });
  }
}

console.log("=== Сомнительные (эвристика, не 100% ошибка) ===\n");
console.log("Одиночный выбор:", weak.length);
for (const w of weak) console.log(JSON.stringify(w));
console.log("\nМультивыбор (низкое пересечение):", multiIssues.length);
for (const w of multiIssues) console.log(JSON.stringify(w));
