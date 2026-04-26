/**
 * Парсит scripts/diver-diseases-raw.txt в структуру для lib/diver-medicine-data.ts
 * Запуск: node scripts/parse-diver-diseases.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const rawPath = path.join(root, "scripts", "diver-diseases-raw.txt");
const outPath = path.join(root, "lib", "diver-medicine-data.ts");

const SECTION = {
  DIAG: "Диагностика",
  TREAT: "Лечение",
  PREV: "Предупреждение",
};

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "section";
}

/** Лёгкая подчистка артефактов извлечения из .doc */
function normalizeLine(line) {
  let L = line;
  if (L.startsWith("Диагно") && L.endsWith("тика") && L.length < 30) L = SECTION.DIAG;
  return L;
}

function cleanText(s) {
  return s
    .replace(/Предупре��дение/g, "Предупреждение")
    .replace(/Предупре[^\s]*ждение/g, "Предупреждение")
    .replace(/\uFFFD{1,2}/g, "…")
    .replace(/воздухо��/g, "воздухом")
    .replace(/назв��нных/g, "названных")
    .replace(/трахеобронх��ал/g, "трахеобронхиал")
    .replace(/брюшной ��орты/g, "брюшной аорты")
    .replace(/н��совое/g, "носовое")
    .replace(/н��/g, "н")
    .replace(/легких н��/g, "легких нос")
    .replace(/л г/g, "лг")
    .trim();
}

function isPrevHeader(line) {
  if (line === SECTION.PREV) return true;
  if (/^Предупре.*ждение$/.test(line) && !line.includes(" ")) return true;
  return false;
}

function isBlankLine(line) {
  return !line || line.trim() === "";
}

/** Индекс первой строки, не входящей в статью: после неё (через пустые) идёт заголовок + Диагностика. */
function endExclusiveBeforeNextTitle(lines, nextD) {
  if (nextD === undefined) return -1;
  let k = nextD - 1;
  while (k >= 0 && isBlankLine(lines[k])) k -= 1;
  if (k < 0) return 0;
  k -= 1;
  while (k >= 0 && isBlankLine(lines[k])) k -= 1;
  return k + 1;
}

function findDiagnosticStarts(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== SECTION.DIAG) continue;
    if (i < 1 || !isBlankLine(lines[i - 1])) continue;
    let j = i - 2;
    while (j >= 0 && isBlankLine(lines[j])) j -= 1;
    const t = (lines[j] ?? "").trim();
    if (!t) continue;
    if ([SECTION.DIAG, SECTION.TREAT, SECTION.PREV].includes(t)) continue;
    out.push(i);
  }
  return out;
}

function findAppendixLine(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/^Приложение\s+\d+/i.test(lines[i].trim())) return i;
  }
  return -1;
}

function linesToString(lines) {
  return cleanText(lines.join("\n").trim());
}

function parseChapterBody(lines) {
  let li = 0;
  const diag = [];
  const treat = [];
  const prev = [];
  let mode = "diag";
  for (; li < lines.length; li++) {
    const L = lines[li];
    if (L === SECTION.TREAT && mode === "diag") {
      mode = "treat";
      continue;
    }
    if (isPrevHeader(L) && mode !== "prev") {
      mode = "prev";
      continue;
    }
    if (mode === "diag") diag.push(L);
    else if (mode === "treat") treat.push(L);
    else prev.push(L);
  }
  return {
    diagnostic: linesToString(diag),
    treatment: linesToString(treat),
    prevention: linesToString(prev),
  };
}

function main() {
  const raw = fs.readFileSync(rawPath, "utf8");
  const lines = raw.split(/\r?\n/).map(normalizeLine);
  const starts = findDiagnosticStarts(lines);
  const appendixLine = findAppendixLine(lines);

  const articles = [];
  const usedSlugs = new Set();

  for (let s = 0; s < starts.length; s++) {
    const d = starts[s];
    const nextD = starts[s + 1];
    const endFromNext = endExclusiveBeforeNextTitle(lines, nextD);
    const end =
      endFromNext >= 0
        ? endFromNext
        : appendixLine >= 0
          ? appendixLine
          : lines.length;
    const title = (lines[d - 2] ?? "").trim();
    if (!title) continue;
    const bodyLines = lines.slice(d + 1, end);
    const { diagnostic, treatment, prevention } = parseChapterBody(bodyLines);
    let id = slugify(title);
    if (usedSlugs.has(id)) id = `${id}-${s}`;
    usedSlugs.add(id);
    articles.push({
      id,
      kind: "article",
      title: cleanText(title),
      diagnostic,
      treatment,
      prevention,
    });
  }

  const appendices = [];
  if (appendixLine >= 0) {
    const rest = lines.slice(appendixLine);
    const head = rest[0]?.trim() ?? "Приложение";
    const body = rest.slice(1);
    const title = cleanText(head);
    let id = slugify(title);
    if (usedSlugs.has(id)) id = `${id}-apx`;
    appendices.push({
      id,
      kind: "appendix",
      title,
      content: cleanText([title, ...body].join("\n")),
    });
  }

  const ts = `// Автогенерация: node scripts/parse-diver-diseases.mjs
// Источник: scripts/diver-diseases-raw.txt

export type DiverMedicineArticle = {
  id: string;
  kind: "article";
  title: string;
  diagnostic: string;
  treatment: string;
  prevention: string;
};

export type DiverMedicineAppendix = {
  id: string;
  kind: "appendix";
  title: string;
  content: string;
};

export type DiverMedicineBlock = DiverMedicineArticle | DiverMedicineAppendix;

export const diverMedicineBlocks: DiverMedicineBlock[] = ${JSON.stringify(
    [...articles, ...appendices],
    null,
    2
  )};
`;
  fs.writeFileSync(outPath, ts, "utf8");
  console.log("Written:", outPath, "articles:", articles.length, "appendix:", appendices.length);
}

main();
