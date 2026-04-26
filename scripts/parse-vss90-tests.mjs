/**
 * Парсит извлечённый из .doc текст (word-extractor) в JSON вопросов.
 * Правильные ответы берутся из блока «Примечание:», т.к. цвет в plain-text недоступен.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WordExtractor from "word-extractor";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, "_vss90_extract.txt");
const OUT = path.join(__dirname, "..", "lib", "vss-tests-90.json");
const DOC = process.env.VSS90_DOC_PATH;

function norm(s) {
  return s
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .replace(/[.;,]/g, "")
    .trim();
}

/** Вопросы 8/10/11 — одно общее примечание с тремя глубинами */
function correctIndexForDepthTriple(question, options, note) {
  const q = question.toLowerCase();
  const n = note.replace(/\s+/g, " ");
  if (!q.includes("кислород") && !q.includes("воздушно-кислород") && !/воздуха/.test(q)) {
    return null;
  }
  const pick = (regex) => {
    const m = n.match(regex);
    return m ? parseInt(m[1], 10) : null;
  };
  let targetM = null;
  if (/кислород/i.test(q) && !/воздушно/i.test(q)) {
    targetM = pick(/кислород[ао][^.]*?не\s*более\s*(\d+)\s*м/i);
  } else if (/воздушно-кислород/i.test(q)) {
    targetM = pick(/воздушно-кислородн[ойя][^.]*?не\s*более\s*(\d+)\s*м/i);
  } else if (/воздуха/i.test(q) && !/воздушно/i.test(q)) {
    targetM = pick(/сжатого\s+воздуха[^.]*?не\s*более\s*(\d+)\s*м/i);
  }
  if (targetM == null) return null;
  const idx = options.findIndex((o) => {
    const m = o.match(/(\d+)\s*м/);
    return m && parseInt(m[1], 10) === targetM;
  });
  return idx >= 0 ? idx : null;
}

/** "через каждые три месяца" + варианты 1; 2; 3; */
function correctIndexFromMonthWord(note, options) {
  const low = note.toLowerCase().replace(/ё/g, "е");
  const wordToNum = {
    один: 1,
    одна: 1,
    одну: 1,
    два: 2,
    двух: 2,
    две: 2,
    три: 3,
    трех: 3,
    четыре: 4,
    пять: 5,
    шесть: 6,
  };
  // без \b: в JS границы слова не работают с кириллицей
  for (const [w, n] of Object.entries(wordToNum)) {
    if (new RegExp(`(^|[^а-яё])${w}\\s+месяц`, "i").test(low)) {
      const idx = options.findIndex((o) => {
        const m = o.match(/^(\d+)\s*;/);
        return m && parseInt(m[1], 10) === n;
      });
      if (idx >= 0) return idx;
    }
  }
  return null;
}

/** "запрещены при давлении…" + в примечании «не менее … 100» → верный вариант «менее 100» */
function correctIndexPressureProhibited(question, options, note) {
  if (!/запрещен/i.test(question) || !/баллон|давлени/i.test(question)) return null;
  if (!/не\s*менее[^.]*100|10\s*МПа[^.]*100/i.test(note)) return null;
  const idx = options.findIndex((o) => /менее\s*100/i.test(o));
  return idx >= 0 ? idx : null;
}

function findCorrectIndex(question, options, note) {
  const allIdx = options.findIndex((o) => /все\s+вышеперечисленные/i.test(o));
  if (allIdx >= 0) return allIdx;

  const triple = correctIndexForDepthTriple(question, options, note);
  if (triple !== null) return triple;

  const monthHit = correctIndexFromMonthWord(note, options);
  if (monthHit !== null) return monthHit;

  const barHit = correctIndexPressureProhibited(question, options, note);
  if (barHit !== null) return barHit;

  const n = norm(note);
  const qLow = question.toLowerCase();

  let bestI = 0;
  let best = -1;

  for (let i = 0; i < options.length; i += 1) {
    let o = options[i].replace(/^\d+\.\s*/, "").trim();
    const oN = norm(o);
    if (oN.length < 2) continue;

    let score = 0;
    if (n.includes(oN)) {
      score = oN.length + 50;
    } else {
      const words = oN.split(" ").filter((w) => w.length > 5);
      score = words.reduce((s, w) => (n.includes(w) ? s + w.length : s), 0);
    }
    if (/^не\s*допускается/i.test(oN) && n.includes("не допускается")) score += 80;
    if (/^допускается/i.test(oN) && n.includes("не допускается")) score -= 30;
    if (/^запрещается/i.test(oN) && n.includes("запрещается")) score += 80;
    if (/^разрешается/i.test(oN) && n.includes("запрещается")) score -= 30;
    if (qLow.includes("запрещен") && /запрещ/i.test(oN)) score += 40;
    if (oN.length < 8 && oN.match(/^\d+/)) {
      if (n.includes(oN)) score += 25;
    }
    if (score > best) {
      best = score;
      bestI = i;
    }
  }
  return bestI;
}

function buildOptionsMergingWrappers(optionLines) {
  return optionLines
    .map((l) => l.replace(/^\d+[.)][\s\u00A0]*/, "").trim())
    .filter(Boolean);
}

function parseExtract(text) {
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const re = /Вопрос\s+(\d+)\.\s*([\s\S]*?)(?=\nВопрос\s+\d+\.|$)/gi;
  const out = [];
  let m;
  while ((m = re.exec(t)) !== null) {
    const num = parseInt(m[1], 10);
    const body = m[2].trim();
    const noteIdx = body.search(/^\s*Примечание\s*:/im);
    if (noteIdx === -1) {
      out.push({ id: `q${num}`, error: "no Примечание", raw: body.slice(0, 200) });
      continue;
    }
    const main = body.slice(0, noteIdx).trim();
    const note = body.slice(noteIdx).replace(/^\s*Примечание\s*:\s*/i, "").trim();
    const lines = main.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      out.push({ id: `q${num}`, error: "too_few_lines", main: main.slice(0, 100) });
      continue;
    }
    const first = lines[0];
    const questionText = first.replace(/^\d+\.?\s*/, "").trim() || first;
    const optionLines = lines.slice(1);
    /** Строка без "1. " в начале — продолжение предыдущего варианта (как в Word) */
    const options = buildOptionsMergingWrappers(optionLines);
    if (options.length < 2) {
      out.push({ id: `q${num}`, error: "too_few_options", n: options.length });
      continue;
    }
    const correctIndex = findCorrectIndex(questionText, options, note);
    const firstLine = lines[0];
    const fullQuestion = firstLine.match(/^Вопрос\s+\d+\.\s*(.+)$/i)
      ? firstLine.replace(/^Вопрос\s+\d+\.\s*/i, "").trim()
      : questionText;
    out.push({
      id: `q${num}`,
      n: num,
      question: fullQuestion,
      options,
      correctIndex,
      note: note.split(/\n/)[0].trim().slice(0, 500),
    });
  }
  return out;
}

let raw;
if (DOC && fs.existsSync(DOC)) {
  const ex = new WordExtractor();
  const document = await ex.extract(DOC);
  raw = document.getBody();
  fs.writeFileSync(SRC, raw, "utf8");
  console.log("Extracted from", DOC, "->", SRC);
} else if (fs.existsSync(SRC)) {
  raw = fs.readFileSync(SRC, "utf8");
} else {
  throw new Error(`Нет ${SRC} и не задан VSS90_DOC_PATH с путём к .doc`);
}
const items = parseExtract(raw);
const errors = items.filter((x) => x.error);
if (errors.length) {
  console.error("Parse issues:", errors.length);
  console.error(JSON.stringify(errors.slice(0, 5), null, 2));
}
const clean = items.filter((x) => !x.error);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ version: 1, source: "Тесты ВСС 90 вопросов 2024", items: clean }, null, 2), "utf8");
console.log("Written", OUT, "items:", clean.length, "errors:", errors.length);
