import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const delimiterIndex = trimmed.indexOf("=");
    if (delimiterIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, delimiterIndex).trim();
    let value = trimmed.slice(delimiterIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const CWD = process.cwd();
const EPBT_DEFAULT = "public/assistant-sources/epbt/epbt-structured.json";
const EPBT_LEGACY = "public/docs/epbt-structured.json";
const MED_DEFAULT = "public/assistant-sources/medicine/medicine-blocks.json";
const MED_LEGACY = "public/docs/medicine-blocks.json";

/**
 * @param {string} envKey KNOWLEDGE_BASE_PATH / MEDICINE_KNOWLEDGE_PATH
 * @param {string} defRel путь от корня репо по умолчанию
 * @param {string} legacyRel путь public/docs/… для совместимости
 */
function resolveDataPath(envKey, defRel, legacyRel) {
  const fromEnv = process.env[envKey] ? resolve(CWD, process.env[envKey]) : null;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  if (fromEnv) {
    // eslint-disable-next-line no-console
    console.warn(
      `[assistant] ${envKey} не указывает на существующий файл: ${fromEnv} — ищу запасной путь (п. ${defRel} / ${legacyRel}).`,
    );
  }
  const primary = resolve(CWD, defRel);
  if (existsSync(primary)) {
    return primary;
  }
  const legacy = resolve(CWD, legacyRel);
  if (existsSync(legacy)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[assistant] подставлен устаревший путь: ${legacyRel} — перенесите в public/assistant-sources/ и задайте ${envKey} при деплое.`,
    );
    return legacy;
  }
  return primary;
}

const PORT = Number(process.env.PORT ?? process.env.ASSISTANT_PORT ?? 8787);
const HOST = process.env.ASSISTANT_HOST ?? "127.0.0.1";
/** Увеличивайте при значимых правках `assistant/server.mjs`; сверяйте с полем в GET `/health` после деплоя. */
const ASSISTANT_SERVER_REVISION = 16;
const KNOWLEDGE_BASE_PATH = resolveDataPath("KNOWLEDGE_BASE_PATH", EPBT_DEFAULT, EPBT_LEGACY);
const MEDICINE_KNOWLEDGE_PATH = resolveDataPath("MEDICINE_KNOWLEDGE_PATH", MED_DEFAULT, MED_LEGACY);
const MEDICINE_DOCUMENT_LABEL = "Мед. справочник (болезни)";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "qwen/qwen3-next-80b-a3b-instruct:free";
const OPENROUTER_MODEL_FALLBACKS = (process.env.OPENROUTER_MODEL_FALLBACKS ??
  "openai/gpt-oss-120b:free,openai/gpt-oss-20b:free,google/gemma-3-12b-it:free,qwen/qwen3-coder:free")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

/**
 * @typedef {{
 * id: string;
 * document: string;
 * section?: string;
 * point?: string;
 * text: string;
 * url?: string;
 * }} KnowledgeChunk
 */

/**
 * @typedef {{
 * document: string;
 * section?: string;
 * point?: string;
 * quote?: string;
 * url?: string;
 * }} AssistantSource
 */

/** @type {KnowledgeChunk[]} */
let knowledgeBase = [];
let epbtChunkCount = 0;
let medicineChunkCount = 0;
const RUSSIAN_STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "на",
  "по",
  "под",
  "с",
  "со",
  "к",
  "ко",
  "о",
  "об",
  "от",
  "до",
  "за",
  "из",
  "у",
  "не",
  "что",
  "как",
  "это",
  "при",
  "или",
  "а",
  "но",
  "ли",
  "для",
  "над",
  "без",
  "же",
  "чтобы",
  "где",
  "когда",
  "какой",
  "какие",
  "какая",
  "каких",
  "кто",
  "его",
  "ее",
  "их",
  "мы",
  "вы",
  "они",
]);

/**
 * @typedef {{
 * preface?: string;
 * chapters?: Array<{
 *   id?: string;
 *   title?: string;
 *   content?: string;
 * }>;
 * }} EpbtStructuredPayload
 */

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

/** Типовые опечатки: «водалазн» и т.п. — иначе не срабатывает справочник болезней и RAG. */
function applyDiverTypoTolerant(n) {
  if (!n) {
    return n;
  }
  return n
    .replace(/водалаз/g, "водолаз")
    .replace(/вадолаз/g, "водолаз")
    .replace(/водолоз/g, "водолаз")
}

function tokenize(value) {
  return applyDiverTypoTolerant(normalizeText(value))
    .split(" ")
    .filter((token) => token.length > 2 && !RUSSIAN_STOP_WORDS.has(token));
}

function scoreChunk(questionTokens, chunk) {
  const text = `${chunk.document} ${chunk.section ?? ""} ${chunk.point ?? ""} ${chunk.text}`;
  const normalized = normalizeText(text);
  let score = 0;

  for (const token of questionTokens) {
    if (normalized.includes(token)) {
      score += 2;
    }
  }

  const phrase = questionTokens.join(" ");
  if (phrase && normalized.includes(phrase)) {
    score += 3;
  }

  return score;
}

function hasEmergencyHelpIntent(question) {
  const normalized = normalizeText(question);
  return (
    normalized.includes("застрял") ||
    normalized.includes("застряла") ||
    normalized.includes("помощ") ||
    normalized.includes("авар") ||
    normalized.includes("потер") ||
    normalized.includes("не отвечает") ||
    normalized.includes("спасти")
  );
}

function hasProcedureIntent(question) {
  const normalized = normalizeText(question);
  return (
    normalized.includes("как проход") ||
    normalized.includes("поряд") ||
    normalized.includes("проведен") ||
    normalized.includes("этап") ||
    normalized.includes("последоват") ||
    normalized.includes("ответствен") ||
    normalized.includes("кто отвеча") ||
    normalized.includes("кто назнач") ||
    normalized.includes("наряд допуск")
  );
}

function hasMedicineIntent(question) {
  const n = applyDiverTypoTolerant(normalizeText(question));
  return (
    n.includes("болезн") ||
    n.includes("заболев") ||
    n.includes("симптом") ||
    n.includes("диагноз") ||
    n.includes("лечен") ||
    n.includes("рекомпресс") ||
    n.includes("декомпресс") ||
    n.includes("баротрав") ||
    n.includes("обжат") ||
    n.includes("барогиперт") ||
    n.includes("кислородн") ||
    n.includes("голодан") ||
    n.includes("отравлен") ||
    n.includes("профилакт") ||
    n.includes("медиц") ||
    n.includes("спецфизиолог") ||
    n.includes("переохлаж") ||
    n.includes("перегрев") ||
    n.includes("гипотерм") ||
    n.includes("обморож") ||
    n.includes("утопл") ||
    n.includes("утопа") ||
    n.includes("температур") ||
    n.includes("озноб") ||
    n.includes("согре") ||
    n.includes("нагрев") ||
    n.includes("теплозащ") ||
    n.includes("гидрокомбинез") ||
    (n.includes("водолазн") && (n.includes("бол") || n.includes("травм") || n.includes("здоров"))) ||
    n.includes("барабан") ||
    n.includes("перепон") ||
    n.includes("легочн") ||
    n.includes("сотряс") ||
    n.includes("пневмо") ||
    n.includes("пузырек") ||
    n.includes("эмбол") ||
    n.includes("вестиб") ||
    n.includes("синус") ||
    n.includes("синусит") ||
    n.includes("залож") ||
    n.includes("ушн") ||
    n.includes("ухо") ||
    n.includes("носов") ||
    n.includes("носа") ||
    n.includes("кровотеч") ||
    n.includes("атропин") ||
    n.includes("нитроглиц") ||
    n.includes("валида") ||
    n.includes("аптечк") ||
    n.includes("санитар") ||
    n.includes("госпитал") ||
    n.includes("инфаркт") ||
    n.includes("инсульт") ||
    n.includes("сердц") ||
    n.includes("кессон") ||
    n.includes("всплыт") ||
    n.includes("недостаточн") ||
    (n.includes("помощ") && (n.includes("перв") || n.includes("само") || n.includes("друг"))) ||
    (n.includes("оказ") && n.includes("помощ")) ||
    (n.includes("вспл") && (n.includes("ух") || n.includes("нос") || n.includes("синус") || n.includes("легк")))
  );
}

/**
 * Обзор «водолазные болезни / что знаешь о болезнях»: токен «водолаз…» везде в ЕПБТ, RAG тянет только ЕПБТ — LLM
 * пишет «в источниках нет болезней». В этом режиме в контекст идут **только** чанки мед. справочника.
 */
function isDivingDiseaseCorpusQuery(question) {
  const n = applyDiverTypoTolerant(normalizeText(question));
  const disease = n.includes("болезн") || n.includes("заболев") || n.includes("заболеван") || n.includes("патолог");
  if (!disease) {
    return false;
  }
  if (
    n.includes("водолаз") ||
    n.includes("водол") ||
    n.includes("ныр") ||
    n.includes("гипербар") ||
    n.includes("кессон") ||
    n.includes("декомп") ||
    n.includes("дивинг") ||
    n.includes("справоч")
  ) {
    return true;
  }
  if (n.includes("знаеш") && n.includes("болезн")) {
    return true;
  }
  if (n.includes("знае") && n.includes("о ") && n.includes("болезн")) {
    return true;
  }
  if (n.includes("расскаж") && n.includes("болезн")) {
    return true;
  }
  if (n.includes("какие") && n.includes("болезн")) {
    return true;
  }
  if (n.includes("перечисл") && n.includes("болезн")) {
    return true;
  }
  if (n.includes("что") && n.includes("так") && n.includes("болезн")) {
    return true;
  }
  return false;
}

/**
 * «Что такое ЕПБТ?» — без преамбулы и «Общие положения / термины» модель берёт несвязные фрагменты
 * (электрооборудование и т.д.) и пишет, что «определения нет».
 */
function isEpbtDefinitionCorpusQuery(question) {
  const n = applyDiverTypoTolerant(normalizeText(question));
  const mentions =
    n.includes("епбт") ||
    (n.includes("един") && n.includes("правил") && (n.includes("водолаз") || n.includes("труд")));
  if (!mentions) {
    return false;
  }
  return (
    n.includes("что так") ||
    n.includes("что за") ||
    (n.includes("что") && n.includes("епбт")) ||
    n.includes("означа") ||
    n.includes("определ") ||
    n.includes("расшифр") ||
    n.includes("как расшифров") ||
    (n.includes("полн") && n.includes("наимен"))
  );
}

/**
 * «Что такое переохлаждение?» / «что за баротравма» — hasMedicineIntent true, но в смеси с ЕПБТ модель
 * цепляется за «в ЕПБТ нет…». Если явно просят определение/объяснение по **мед. теме** — контекст только из справочника болезней.
 */
function isMedicineDefinitionCorpusQuery(question) {
  if (!hasMedicineIntent(question) || isEpbtDefinitionCorpusQuery(question)) {
    return false;
  }
  const n = applyDiverTypoTolerant(normalizeText(question));
  return (
    n.includes("что так") ||
    n.includes("что за") ||
    n.includes("что это") ||
    n.includes("как назыв") ||
    (n.includes("что") && n.includes("означа")) ||
    n.includes("дай опред") ||
    n.includes("расскаж") ||
    n.includes("поясн") ||
    n.includes("объясн")
  );
}

function isMedicineChunk(chunk) {
  return String(chunk.document ?? "").includes("Мед.") || String(chunk.document ?? "").toLowerCase().includes("мед.");
}

function medicineBonus(chunk, question) {
  if (!isMedicineChunk(chunk) || !hasMedicineIntent(question)) {
    return 0;
  }
  return 6;
}

/** Тот же вес, что и в selectPrimarySources / retrieveChunks — для решения, показывать ли ссылки. */
function sourceAttachmentScore(question, chunk) {
  const questionTokens = tokenize(question);
  return (
    scoreChunk(questionTokens, chunk) +
    (hasEmergencyHelpIntent(question) ? emergencyBonus(chunk) : 0) +
    (hasProcedureIntent(question) ? procedureBonus(chunk) : 0) +
    medicineBonus(chunk, question)
  );
}

/**
 * Когда прикреплять `sources` и строчку «Источник: …» в теле ответа.
 * Если ретривер уже отобрал чанки (есть primary) — всегда отдаём источники и ссылки в UI.
 */
function shouldIncludeSourcesInResponse(question, primarySources) {
  return primarySources.length > 0;
}

function sourceAttributionLine(chunk) {
  const doc = (chunk.document || "источник").trim();
  const sec = (chunk.section || "").replace(/\s+/g, " ").trim();
  const pt = (chunk.point || "").replace(/\s+/g, " ").trim();
  if (sec && pt) {
    return `Источник: ${doc} — ${sec} — ${pt}.`;
  }
  if (sec) {
    return `Источник: ${doc} — ${sec}.`;
  }
  if (pt) {
    return `Источник: ${doc} — ${pt}.`;
  }
  return `Источник: ${doc}.`;
}

/**
 * Цитаты для UI: по мед. вопросу — лучший фрагмент **по всей** базе справочника, иначе в топ-4 RAG
 * часто только ЕПБТ, и ссылка «медицина» пропадала.
 * @param {string} question
 * @param {KnowledgeChunk[]} chunks
 * @returns {{ citation: string | null; sourceUrl: string | null }}
 */
function buildCitationPayload(question, chunks) {
  if (hasMedicineIntent(question)) {
    const allMed = knowledgeBase.filter(isMedicineChunk);
    if (allMed.length) {
      const scored = allMed
        .map((chunk) => ({ chunk, score: sourceAttachmentScore(question, chunk) }))
        .sort((a, b) => b.score - a.score);
      const top = scored[0].chunk;
      return {
        citation: sourceAttributionLine(top),
        sourceUrl: top.url || "/assistant-docs/medicine/full/",
      };
    }
  }
  if (!chunks.length) {
    // Пустой RAG (нестандартные формулировки): всё равно дать ссылку на ЕПБТ, если в подборку не попал ни один чанк
    if (knowledgeBase.length) {
      const topKb = pickAttributionChunk(question, knowledgeBase);
      if (topKb) {
        return {
          citation: sourceAttributionLine(topKb),
          sourceUrl: topKb.url || "/assistant-docs/epbt/full/",
        };
      }
    }
    return { citation: null, sourceUrl: null };
  }
  const attrChunk = pickAttributionChunk(question, chunks);
  if (!attrChunk) {
    return { citation: null, sourceUrl: null };
  }
  const sourceUrl =
    attrChunk.url ||
    (isMedicineChunk(attrChunk) ? "/assistant-docs/medicine/full/" : "/handbook/epbt/");
  return {
    citation: sourceAttributionLine(attrChunk),
    sourceUrl,
  };
}

/**
 * Для отображения и подписи «Источник:»: при явном мед. вопросе — лучший релевантный чанк справочника,
 * иначе лучший по score (как в ранжировании), чтобы не подставлять ЕПБТ, если ответ логично из «Медицины».
 * @param {string} question
 * @param {KnowledgeChunk[]} chunks
 * @returns {KnowledgeChunk | null}
 */
function pickAttributionChunk(question, chunks) {
  if (!chunks.length) {
    return null;
  }

  const scored = chunks
    .map((chunk) => ({ chunk, score: sourceAttachmentScore(question, chunk) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestAny = scored.length ? scored[0].chunk : chunks[0];

  if (hasMedicineIntent(question)) {
    const medScored = scored.filter((item) => isMedicineChunk(item.chunk));
    if (medScored.length) {
      return medScored[0].chunk;
    }
    // В RAG-выборке только ЕПБТ, а мед. чанки с нулевым токен-скором отфильтрованы — берём лучший мед. из подборки
    const medOnly = chunks.filter(isMedicineChunk);
    if (medOnly.length) {
      return medOnly
        .map((chunk) => ({ chunk, score: sourceAttachmentScore(question, chunk) }))
        .sort((a, b) => b.score - a.score)[0].chunk;
    }
  }

  return bestAny;
}

/** Сохраняет порядок релевантности, но выводит мед. фрагменты первыми в блоке ссылок. */
function orderRefsForDisplay(question, refs) {
  if (!hasMedicineIntent(question) || refs.length < 2) {
    return refs;
  }
  const med = refs.filter(isMedicineChunk);
  const rest = refs.filter((c) => !isMedicineChunk(c));
  if (!med.length) {
    return refs;
  }
  return [...med, ...rest];
}

function emergencyBonus(chunk) {
  const normalized = normalizeText(`${chunk.section ?? ""} ${chunk.point ?? ""} ${chunk.text}`);
  let bonus = 0;
  if ((chunk.section ?? "").toLowerCase().includes("приложение")) bonus -= 6;
  if (normalized.includes("страхующ")) bonus += 8;
  if (normalized.includes("оказани") && normalized.includes("помощ")) bonus += 6;
  if (normalized.includes("руководител") && normalized.includes("спуск")) bonus += 4;
  if (normalized.includes("потер") && normalized.includes("связ")) bonus += 5;
  if (normalized.includes("немедлен")) bonus += 2;
  return bonus;
}

function procedureBonus(chunk) {
  const section = normalizeText(chunk.section ?? "");
  const point = normalizeText(chunk.point ?? "");
  const text = normalizeText(chunk.text);
  let bonus = 0;

  if (section.includes("подготовка к водолазным спускам")) bonus += 8;
  if (section.includes("управление и руководство")) bonus += 7;
  if (section.includes("допуск")) bonus += 6;
  if (section.includes("обязанности")) bonus += 5;
  if (section.includes("общие положения")) bonus -= 6;
  if (section.includes("основные термины")) bonus -= 7;
  if (section.includes("приложение")) bonus -= 3;

  if (text.includes("назначен") || text.includes("назначают")) bonus += 5;
  if (text.includes("руководитель водолазных работ")) bonus += 6;
  if (text.includes("руководитель водолазных спусков")) bonus += 6;
  if (text.includes("старшина") || text.includes("бригадир")) bonus += 5;
  if (text.includes("страхующ") || text.includes("обеспечивающ")) bonus += 4;
  if (text.includes("наряд допуск") || text.includes("журнал водолазных работ")) bonus += 5;
  if (text.includes("перед началом") || text.includes("до начала")) bonus += 4;
  if (text.includes("инструктаж")) bonus += 3;
  if (text.includes("медицинск") && text.includes("обеспеч")) bonus += 3;
  if (point.includes("фрагмент 1") && section.includes("общие положения")) bonus -= 4;

  return bonus;
}

function retrieveChunks(question, limit = 6) {
  const medOnly = knowledgeBase.filter(isMedicineChunk);
  if (isDivingDiseaseCorpusQuery(question) && medOnly.length) {
    const sorted = [...medOnly].sort((a, b) => String(a.id).localeCompare(String(b.id), "ru"));
    return sorted.slice(0, limit);
  }

  if (isEpbtDefinitionCorpusQuery(question)) {
    const epbt = knowledgeBase.filter((c) => !isMedicineChunk(c));
    const preface = epbt.filter((c) => String(c.id).includes("preface"));
    const g1 = epbt.filter((c) =>
      applyDiverTypoTolerant(normalizeText(c.section || "")).includes("глава 1"),
    );
    const g2 = epbt.filter((c) =>
      applyDiverTypoTolerant(normalizeText(c.section || "")).includes("глава 2"),
    );
    const merged = [...preface, ...g1, ...g2];
    if (merged.length) {
      const seen = new Set();
      const out = [];
      for (const c of merged) {
        if (out.length >= limit) {
          break;
        }
        if (!seen.has(c.id)) {
          seen.add(c.id);
          out.push(c);
        }
      }
      return out;
    }
  }

  if (isMedicineDefinitionCorpusQuery(question) && medOnly.length) {
    const scored = medOnly
      .map((chunk) => ({ chunk, score: sourceAttachmentScore(question, chunk) }))
      .sort((a, b) => b.score - a.score);
    return scored.map((item) => item.chunk).slice(0, limit);
  }

  const medIntent = hasMedicineIntent(question);
  const tokens = tokenize(question);
  if (!tokens.length) {
    return medIntent ? medOnly.slice(0, limit) : [];
  }

  const emergencyIntent = hasEmergencyHelpIntent(question);
  const procedureIntent = hasProcedureIntent(question);

  const scored = knowledgeBase.map((chunk) => {
    const baseScore = scoreChunk(tokens, chunk);
    let score = baseScore;
    if (emergencyIntent) score += emergencyBonus(chunk);
    if (procedureIntent) score += procedureBonus(chunk);
    score += medicineBonus(chunk, question);
    return { chunk, score };
  });

  const positive = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (positive.length) {
    let out = positive.slice(0, limit).map((item) => item.chunk);
    // Вопросы по болезням: в контекст LLM обязаны попасть фрагменты справочника (а не только ЕПБТ с высоким весом).
    if (medIntent) {
      const medFromAll = scored
        .filter((item) => isMedicineChunk(item.chunk))
        .sort((a, b) => b.score - a.score);
      const seen = new Set(out.map((c) => c.id));
      const pref = [];
      for (const item of medFromAll) {
        if (pref.length >= Math.min(3, limit)) break;
        if (!seen.has(item.chunk.id)) {
          pref.push(item.chunk);
          seen.add(item.chunk.id);
        }
      }
      if (pref.length) {
        const rest = out.filter((c) => !pref.some((p) => p.id === c.id));
        out = [...pref, ...rest].slice(0, limit);
      }
      // Мед. намерение есть, но в топе только ЕПБТ (на проде med=0 или сбой подмеса) — иначе LLM пишет «в ЕПБТ нет…»
      if (medOnly.length && out.length && out.every((c) => !isMedicineChunk(c))) {
        const scoredM = medOnly
          .map((chunk) => ({ chunk, score: sourceAttachmentScore(question, chunk) }))
          .sort((a, b) => b.score - a.score);
        out = scoredM.map((x) => x.chunk).slice(0, limit);
      }
    }
    return out;
  }

  // Иначе LLM и без источников: скор 0 у всех (другие формулировки, опечатки). Для явно мед. тем — фрагменты справочника.
  if (medIntent) {
    const medScored = scored
      .filter((item) => isMedicineChunk(item.chunk))
      .sort((a, b) => b.score - a.score);
    if (medScored.length) {
      return medScored.slice(0, limit).map((item) => item.chunk);
    }
    return knowledgeBase.filter(isMedicineChunk).slice(0, limit);
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((item) => item.chunk);
}

function selectPrimarySources(question, chunks, maxSources = 2) {
  if (!chunks.length) {
    return [];
  }

  const emergencyIntent = hasEmergencyHelpIntent(question);
  const procedureIntent = hasProcedureIntent(question);
  const effectiveMaxSources = emergencyIntent ? 1 : maxSources;
  const questionTokens = tokenize(question);
  const scored = chunks
    .map((chunk) => ({
      chunk,
      score:
        scoreChunk(questionTokens, chunk) +
        (emergencyIntent ? emergencyBonus(chunk) : 0) +
        (procedureIntent ? procedureBonus(chunk) : 0) +
        medicineBonus(chunk, question),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return chunks.slice(0, 1);
  }

  const bestScore = scored[0].score;
  const threshold = Math.max(2, Math.floor(bestScore * 0.72));
  const selected = [];
  const usedSections = new Set();

  for (const item of scored) {
    if (item.score < threshold) {
      continue;
    }

    const sectionKey = `${item.chunk.section ?? ""}|${item.chunk.point ?? ""}`;
    if (usedSections.has(sectionKey)) {
      continue;
    }
    usedSections.add(sectionKey);
    selected.push(item.chunk);
    if (selected.length >= effectiveMaxSources) {
      break;
    }
  }

  return selected.length ? selected : [scored[0].chunk];
}

function selectSourceReferences(question, chunks, maxRefs = 4) {
  if (!chunks.length) {
    return [];
  }

  const emergencyIntent = hasEmergencyHelpIntent(question);
  const procedureIntent = hasProcedureIntent(question);
  const questionTokens = tokenize(question);
  const scored = chunks
    .map((chunk) => {
      const baseScore = scoreChunk(questionTokens, chunk);
      let score = baseScore;
      if (emergencyIntent) score += emergencyBonus(chunk);
      if (procedureIntent) score += procedureBonus(chunk);
      score += medicineBonus(chunk, question);
      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return chunks.slice(0, 1);
  }

  const bestScore = scored[0].score;
  const threshold = Math.max(2, Math.floor(bestScore * (emergencyIntent ? 0.65 : procedureIntent ? 0.62 : 0.55)));
  const selected = [];
  const usedSectionPoint = new Set();

  for (const item of scored) {
    if (item.score < threshold) continue;
    const key = `${item.chunk.section ?? ""}|${item.chunk.point ?? ""}`;
    if (usedSectionPoint.has(key)) continue;
    usedSectionPoint.add(key);
    selected.push(item.chunk);
    if (selected.length >= maxRefs) break;
  }

  return selected.length ? selected : [scored[0].chunk];
}

function buildSources(question, chunks) {
  const refs = orderRefsForDisplay(
    question,
    selectSourceReferences(question, chunks, hasEmergencyHelpIntent(question) ? 3 : 4),
  );
  if (!refs.length) {
    return [];
  }

  const primary = pickAttributionChunk(question, refs) ?? refs[0];
  const fromMedicine = isMedicineChunk(primary);
  const primaryUrl =
    primary.url ||
    (fromMedicine ? "/assistant-docs/medicine/full/" : "/handbook/epbt/");
  return [
    {
      document: fromMedicine ? "Справочник болезней" : "ЕПБТ",
      section: fromMedicine
        ? "Медицинский справочник (водолазная служба)"
        : "Единые правила безопасности труда на водолазных работах",
      point: `${refs.length} релевантн. фрагм.`,
      quote: shortenText(primary.text, 220),
      url: primaryUrl,
      refs: refs.map((chunk) => ({
        section: chunk.section,
        point: chunk.point,
        quote: shortenText(chunk.text, 260),
        url: chunk.url || (isMedicineChunk(chunk) ? "/assistant-docs/medicine/full/" : "/handbook/epbt/"),
      })),
    },
  ];
}

function splitIntoParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);
}

function splitChapterContent(text) {
  const normalized = text.replace(/\r/g, "");
  const splitByPoints = normalized
    .split(/(?=\n\d{1,3}\.\s)/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  if (splitByPoints.length > 1) {
    return splitByPoints;
  }

  return splitIntoParagraphs(normalized);
}

function shortenText(text, maxLength = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

/**
 * @param {EpbtStructuredPayload} payload
 * @returns {KnowledgeChunk[]}
 */
function mapEpbtStructuredToKnowledge(payload) {
  /** @type {KnowledgeChunk[]} */
  const chunks = [];

  const prefaceRaw = typeof payload.preface === "string" ? payload.preface.trim() : "";
  if (prefaceRaw) {
    const prefaceId = "preface";
    const prefaceParts = splitChapterContent(prefaceRaw);
    const parts = prefaceParts.length ? prefaceParts : [prefaceRaw];
    for (const [i, part] of parts.entries()) {
      if (!String(part).trim()) {
        continue;
      }
      const chunkId = `epbt-${prefaceId}-${i + 1}`;
      chunks.push({
        id: chunkId,
        document: "ЕПБТ",
        section: "Преамбула (постановление, полное наименование ЕПБТ)",
        point: `фрагмент ${i + 1}`,
        text: part,
        url: `/assistant-docs/epbt/full/?focus=${encodeURIComponent(chunkId)}#${encodeURIComponent(prefaceId)}`,
      });
    }
  }

  const chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  for (const [chapterIndex, chapter] of chapters.entries()) {
    const title = typeof chapter.title === "string" ? chapter.title.trim() : `Глава ${chapterIndex + 1}`;
    const chapterId = typeof chapter.id === "string" && chapter.id.trim() ? chapter.id.trim() : `chapter-${chapterIndex + 1}`;
    const content = typeof chapter.content === "string" ? chapter.content.trim() : "";
    if (!content) {
      continue;
    }

    const paragraphs = splitChapterContent(content);
    if (!paragraphs.length) {
      const chunkId = `epbt-${chapterId}-1`;
      chunks.push({
        id: chunkId,
        document: "ЕПБТ",
        section: title,
        point: "фрагмент 1",
        text: content,
        url: `/assistant-docs/epbt/full/?focus=${chunkId}#${chapterId}`,
      });
      continue;
    }

    for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
      const chunkId = `epbt-${chapterId}-${paragraphIndex + 1}`;
      chunks.push({
        id: chunkId,
        document: "ЕПБТ",
        section: title,
        point: `фрагмент ${paragraphIndex + 1}`,
        text: paragraph,
        url: `/assistant-docs/epbt/full/?focus=${chunkId}#${chapterId}`,
      });
    }
  }

  return chunks;
}

/**
 * @param {{ diverMedicineBlocks?: unknown[] }} data
 * @returns {{ chunks: KnowledgeChunk[]; stats: { blocks: number; textChunks: number } }}
 */
function mapMedicineToKnowledge(data) {
  const list = Array.isArray(data?.diverMedicineBlocks) ? data.diverMedicineBlocks : [];
  if (!list.length) {
    return { chunks: [], stats: { blocks: 0, textChunks: 0 } };
  }

  /** @type {KnowledgeChunk[]} */
  const chunks = [];
  let textChunks = 0;

  /** @param {string} chunkId @param {string} blockId */
  const medicineSourceUrl = (chunkId, blockId) =>
    `/assistant-docs/medicine/full/?focus=${encodeURIComponent(chunkId)}#${encodeURIComponent(blockId)}`;

  for (const block of list) {
    if (!block || typeof block !== "object") continue;
    const id = typeof block.id === "string" ? block.id : "unknown";
    const title = typeof block.title === "string" ? block.title.trim() : "Справочник болезней";

    if (block.kind === "appendix") {
      const content = typeof block.content === "string" ? block.content.trim() : "";
      if (!content) continue;
      const subparts = splitChapterContent(content);
      for (const [paragraphIndex, paragraph] of subparts.entries()) {
        if (!String(paragraph).trim()) continue;
        textChunks += 1;
        const chunkId = `med-app-${id}-${paragraphIndex + 1}`;
        chunks.push({
          id: chunkId,
          document: MEDICINE_DOCUMENT_LABEL,
          section: title,
          point: `Приложение · фрагмент ${paragraphIndex + 1}`,
          text: paragraph,
          url: medicineSourceUrl(chunkId, id),
        });
      }
      continue;
    }

    if (block.kind !== "article") continue;

    for (const [field, label] of /** @type {const} */ ([
      ["diagnostic", "Диагностика"],
      ["treatment", "Лечение"],
      ["prevention", "Профилактика"],
    ])) {
      const raw = block[field];
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) continue;
      const subparts = splitChapterContent(text);
      for (const [paragraphIndex, paragraph] of subparts.entries()) {
        if (!String(paragraph).trim()) continue;
        textChunks += 1;
        const chunkId = `med-${id}-${field}-${paragraphIndex + 1}`;
        chunks.push({
          id: chunkId,
          document: MEDICINE_DOCUMENT_LABEL,
          section: title,
          point: `${label} · фрагмент ${paragraphIndex + 1}`,
          text: paragraph,
          url: medicineSourceUrl(chunkId, id),
        });
      }
    }
  }

  return { chunks, stats: { blocks: list.length, textChunks } };
}

function fallbackAnswer(question, chunks) {
  const primarySources = selectPrimarySources(question, chunks, 2);
  const shouldAttachSources = shouldIncludeSourcesInResponse(question, primarySources);

  if (!chunks.length) {
    const citeEmpty = buildCitationPayload(question, chunks);
    return {
      answer:
        "Кратко: в ЕПБТ и справочнике болезней не нашлось достаточно данных по этому вопросу.\n\nОснование:\n- Нет релевантных фрагментов в текущей выборке.\n\nПрактически:\n- Уточните запрос: болезнь или симптом, термин из ЕПБТ, глубину, вид работ или номер пункта.",
      sources: [],
      citation: citeEmpty.citation,
      sourceUrl: citeEmpty.sourceUrl,
    };
  }

  const brief = primarySources
    .map((chunk, index) => `${index + 1}. ${shortenText(chunk.text)}`)
    .join("\n");

  const baseAnswer = `Кратко: по доступным источникам (ЕПБТ и справочник болезней) найдено релевантное основание.\n\nОснование:\n${brief}\n\nПрактически:\n- При необходимости уточните вопрос (симптом, глубина, вид работ, пункт ЕПБТ), чтобы получить более точный ответ.`;
  const cite = buildCitationPayload(question, chunks);

  return {
    answer: baseAnswer,
    sources: shouldAttachSources ? buildSources(question, chunks) : [],
    citation: cite.citation,
    sourceUrl: cite.sourceUrl,
  };
}

async function askOpenRouter(question, chunks, model) {
  const context = chunks
    .map((chunk, index) => {
      return `Источник ${index + 1}
Документ: ${chunk.document}
Раздел: ${chunk.section ?? "-"}
Пункт: ${chunk.point ?? "-"}
Текст: ${chunk.text}`;
    })
    .join("\n\n");

  const systemPrompt =
    "Ты ассистент по материалам водолазной службы: ЕПБТ (РБ) и справочник болезней для водолазов. " +
    "Отвечай строго на основе переданных источников. " +
    "Если в контексте есть фрагменты с «Мед. справочник» (болезни) — на вопросы о водолазных болезнях, перечислении, диагнозе, лечении и профилактике опирайся на них; не утверждай, что «в нормативах нет сведений о болезнях», если эти фрагменты переданы. " +
    "Если вопрос про определение мед. термина (переохлаждение, баротравма, гипотермия и т.д.) — отвечай по фрагментам с Документ «Мед. справочник»; не пиши, что в ЕПБТ нет определения, пока в контексте есть мед. фрагменты по этой теме. " +
    "Не выдумывай нормы, пункты, диагнозы и факты. Если данных недостаточно, прямо скажи об этом. " +
    "Пиши понятным, человеческим языком, как опытный инструктор. " +
    "Добавляй 1-2 уместных эмодзи внутри предложений по смыслу (например рядом с важным действием/предупреждением), но без перегруза. " +
    "Не предлагай опасные или самовольные действия, если они не подтверждены источником как штатная процедура. " +
    "Для вопросов о болезнях и помощи: опирайся на справочник; для вопросов о порядке работ и нормах — на ЕПБТ. " +
    "Для аварийных вопросов приоритет: команда руководителя спуска, действия страхующего водолаза и безопасное оказание помощи.";

  const hasContext = chunks.length > 0;
  const sourceInstruction = hasContext
    ? `Используй только эти источники:
${context}`
    : "Источники по запросу не найдены. Дай полезный краткий ответ без ссылок и без ссылок на пункты документов.";

  const userPrompt = `Вопрос: ${question}

${sourceInstruction}

Сформируй ответ как цельный, короткий и понятный текст без секций/заголовков.
В самом конце на отдельной строке кратко укажи опору по источникам: одна строка «Источник: <как в поле Документ> — <Раздел/статья> — <Пункт/фрагмент>» — по тому фрагменту, на котором основан ответ. Если вопрос о болезни, симптомах, лечении, диагнозе — укажи в строке «Источник» фрагмент из справочника болезней (не ЕПБТ), если в контексте есть такой фрагмент. URL и markdown-ссылки в тексте не пиши.
Если вопрос про порядок проведения работ, отвечай строго по схеме: кто назначается -> подготовка до спуска -> проведение -> контроль/документы.
Если вопрос про ответственных, обязательно назови конкретные роли, но только если они подтверждены источником.
Не давай общих определений, если вопрос про порядок/ответственных.
Не добавляй отдельную строку только из эмодзи и не ставь эмодзи отдельным хвостом в конце ответа.
Ограничения: не более 650 символов основного объяснения; строка «Источник:» может идти сразу после и не сильно удлиняет ответ. Без markdown-таблиц, без длинных цитат, без повторов вопроса.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mchs-rb-assistant.local",
      "X-Title": "MCHS-RB-Assistant",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`OpenRouter error ${response.status}: ${errorText}`);
    // @ts-ignore - attach status for retry logic
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("OpenRouter вернул пустой ответ.");
  }

  const primarySources = selectPrimarySources(question, chunks, 2);
  const shouldAttachSources = shouldIncludeSourcesInResponse(question, primarySources);
  const cite = buildCitationPayload(question, chunks);

  return {
    answer: answer.trim(),
    sources: shouldAttachSources ? buildSources(question, chunks) : [],
    citation: cite.citation,
    sourceUrl: cite.sourceUrl,
  };
}

async function askOpenRouterWithFallback(question, chunks) {
  const tried = [];
  const modelsToTry = [OPENROUTER_MODEL, ...OPENROUTER_MODEL_FALLBACKS].filter(
    (model, index, all) => all.indexOf(model) === index,
  );

  for (const model of modelsToTry) {
    try {
      const result = await askOpenRouter(question, chunks, model);
      return {
        ...result,
        modelUsed: model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown OpenRouter error";
      tried.push({ model, message });
      const statusCode = error && typeof error === "object" ? Number(error.statusCode) : NaN;
      if (!Number.isFinite(statusCode) || (statusCode !== 404 && statusCode !== 429)) {
        break;
      }
    }
  }

  const details = tried.map((item) => `${item.model}: ${item.message}`).join(" | ");
  throw new Error(`Не удалось получить ответ от OpenRouter. Попытки: ${details}`);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Expose-Headers": "X-Assistant-Revision, X-Assistant-Medicine-Chunks",
    "Access-Control-Max-Age": "86400",
  };
}

/** Путь запроса без query; без завершающего слэша (кроме корня) — совместимость с /assistant/ на прокси. */
function requestPathname(url) {
  if (!url) return "/";
  const pathOnly = url.split("?")[0] || "/";
  if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
    return pathOnly.replace(/\/+$/g, "") || "/";
  }
  return pathOnly;
}

function writeJson(res, statusCode, payload) {
  if (statusCode === 204) {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }
  res.writeHead(statusCode, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "X-Assistant-Revision": String(ASSISTANT_SERVER_REVISION),
    "X-Assistant-Medicine-Chunks": String(medicineChunkCount),
  });
  res.end(JSON.stringify(payload));
}

async function bootstrapKnowledgeBase() {
  const raw = await readFile(KNOWLEDGE_BASE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  /** @type {KnowledgeChunk[]} */
  let epbtChunks;
  if (Array.isArray(parsed)) {
    epbtChunks = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.chapters)) {
    epbtChunks = mapEpbtStructuredToKnowledge(parsed);
  } else {
    throw new Error("Неподдерживаемый формат базы знаний. Используйте массив чанков или epbt-structured.json.");
  }

  epbtChunkCount = epbtChunks.length;

  /** @type {KnowledgeChunk[]} */
  let medChunks = [];
  if (existsSync(MEDICINE_KNOWLEDGE_PATH)) {
    try {
      const medRaw = await readFile(MEDICINE_KNOWLEDGE_PATH, "utf8");
      const medParsed = JSON.parse(medRaw);
      const { chunks, stats } = mapMedicineToKnowledge(medParsed);
      medChunks = chunks;
      medicineChunkCount = medChunks.length;
      // eslint-disable-next-line no-console
      console.log(
        `[assistant] мед. справочник: ${medicineChunkCount} чанков (текст. фрагм.: ${stats.textChunks} · записей: ${stats.blocks}) — ${MEDICINE_KNOWLEDGE_PATH}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(`[assistant] не удалось загрузить ${MEDICINE_KNOWLEDGE_PATH}: ${message}`);
      medicineChunkCount = 0;
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[assistant] файл мед. справочника не найден (${MEDICINE_KNOWLEDGE_PATH}) — сгенерировать: node scripts/emit-medicine-knowledge.mjs`);
    medicineChunkCount = 0;
  }

  knowledgeBase = [...epbtChunks, ...medChunks];
  if (!knowledgeBase.length) {
    // eslint-disable-next-line no-console
    console.error(`[assistant] пустой knowledge base, проверьте: ${KNOWLEDGE_BASE_PATH}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[assistant] база знаний: ${knowledgeBase.length} чанков (ЕПБТ: ${epbtChunkCount} · мед.: ${medicineChunkCount})`,
    );
  }
  if (medicineChunkCount === 0) {
    // eslint-disable-next-line no-console
    console.error(
      "[assistant] ВНИМАНИЕ: мед. справочник не загружен (0 чанков). Вопросы о болезнях будут отвечать только по ЕПБТ. " +
        `Проверьте: ${MEDICINE_KNOWLEDGE_PATH} и перед стартом: node scripts/emit-medicine-knowledge.mjs`,
    );
  }
}

await bootstrapKnowledgeBase();

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    const path = requestPathname(req.url);

    if (req.method === "OPTIONS") {
      writeJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && path === "/health") {
      writeJson(res, 200, {
        status: "ok",
        assistantServerRevision: ASSISTANT_SERVER_REVISION,
        knowledgeChunks: knowledgeBase.length,
        knowledgeChunksEpbt: epbtChunkCount,
        knowledgeChunksMedicine: medicineChunkCount,
        llmConfigured: Boolean(OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
      });
      return;
    }

    if (req.method === "POST" && path === "/assistant") {
      const body = await readBody(req);
      const question = typeof body?.question === "string" ? body.question.trim() : "";
      if (!question) {
        writeJson(res, 400, { error: "Поле question обязательно." });
        return;
      }

      const chunkLimit = isDivingDiseaseCorpusQuery(question)
        ? 8
        : isEpbtDefinitionCorpusQuery(question) || isMedicineDefinitionCorpusQuery(question)
          ? 6
          : 4;
      const matchedChunks = retrieveChunks(question, chunkLimit);
      if (!OPENROUTER_API_KEY) {
        writeJson(res, 200, fallbackAnswer(question, matchedChunks));
        return;
      }

      try {
        const response = await askOpenRouterWithFallback(question, matchedChunks);
        writeJson(res, 200, response);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Ошибка генерации ответа.";
        const fallback = fallbackAnswer(question, matchedChunks);
        writeJson(res, 200, {
          ...fallback,
          warning: reason,
        });
      }
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    writeJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Assistant API listening at http://${HOST}:${PORT}`);
  console.log(`Knowledge base: ${KNOWLEDGE_BASE_PATH}`);
  console.log(`Medicine JSON: ${MEDICINE_KNOWLEDGE_PATH}`);
  console.log(`LLM: ${OPENROUTER_API_KEY ? "enabled" : "fallback mode"} (${OPENROUTER_MODEL})`);
  if (OPENROUTER_API_KEY && OPENROUTER_MODEL_FALLBACKS.length) {
    console.log(`LLM fallbacks: ${OPENROUTER_MODEL_FALLBACKS.join(", ")}`);
  }
});
