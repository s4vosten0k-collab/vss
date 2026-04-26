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

const PORT = Number(process.env.PORT ?? process.env.ASSISTANT_PORT ?? 8787);
const HOST = process.env.ASSISTANT_HOST ?? "127.0.0.1";
const KNOWLEDGE_BASE_PATH = resolve(process.cwd(), process.env.KNOWLEDGE_BASE_PATH ?? "public/docs/epbt-structured.json");
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

function tokenize(value) {
  return normalizeText(value)
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
  const tokens = tokenize(question);
  if (!tokens.length) {
    return [];
  }

  const emergencyIntent = hasEmergencyHelpIntent(question);
  const procedureIntent = hasProcedureIntent(question);

  return knowledgeBase
    .map((chunk) => {
      const baseScore = scoreChunk(tokens, chunk);
      let score = baseScore;
      if (emergencyIntent) score += emergencyBonus(chunk);
      if (procedureIntent) score += procedureBonus(chunk);
      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.chunk);
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
        (procedureIntent ? procedureBonus(chunk) : 0),
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
  const refs = selectSourceReferences(question, chunks, hasEmergencyHelpIntent(question) ? 3 : 4);
  if (!refs.length) {
    return [];
  }

  const primary = refs[0];
  return [
    {
      document: "ЕПБТ",
      section: "Единые правила безопасности труда на водолазных работах",
      point: `${refs.length} релевантн. фрагм.`,
      quote: shortenText(primary.text, 220),
      url: primary.url,
      refs: refs.map((chunk) => ({
        section: chunk.section,
        point: chunk.point,
        quote: shortenText(chunk.text, 260),
        url: chunk.url,
      })),
    },
  ];
}

function hasStrongSourceMatch(question, chunks, minScore = 4) {
  if (!chunks.length) {
    return false;
  }

  const emergencyIntent = hasEmergencyHelpIntent(question);
  const procedureIntent = hasProcedureIntent(question);
  const questionTokens = tokenize(question);
  const meaningfulTokens = questionTokens.filter((token) => token.length >= 4);
  if (!meaningfulTokens.length) {
    return false;
  }

  let bestScore = 0;
  let bestMatchedTokenCount = 0;
  for (const chunk of chunks) {
    const chunkText = normalizeText(`${chunk.document} ${chunk.section ?? ""} ${chunk.point ?? ""} ${chunk.text}`);
    let matchedTokenCount = 0;
    for (const token of meaningfulTokens) {
      if (chunkText.includes(token)) {
        matchedTokenCount += 1;
      }
    }

    let score = scoreChunk(questionTokens, chunk);
    if (emergencyIntent) score += emergencyBonus(chunk);
    if (procedureIntent) score += procedureBonus(chunk);
    if (score > bestScore) {
      bestScore = score;
      bestMatchedTokenCount = matchedTokenCount;
      continue;
    }
    if (score === bestScore && matchedTokenCount > bestMatchedTokenCount) {
      bestMatchedTokenCount = matchedTokenCount;
    }
  }

  if (meaningfulTokens.length === 1) {
    const singleToken = meaningfulTokens[0];
    return singleToken.length >= 6 && bestMatchedTokenCount >= 1 && bestScore >= 5;
  }

  return bestMatchedTokenCount >= 2 && bestScore >= minScore;
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

function fallbackAnswer(question, chunks) {
  const primarySources = selectPrimarySources(question, chunks, 2);
  const shouldAttachSources = hasStrongSourceMatch(question, primarySources);

  if (!chunks.length) {
    return {
      answer:
        "Кратко: в ЕПБТ не нашлось достаточно данных по этому вопросу.\n\nОснование:\n- Нет релевантных фрагментов в текущей выборке.\n\nПрактически:\n- Уточните запрос: добавьте термин, глубину, вид работ или номер пункта.",
      sources: [],
    };
  }

  const brief = primarySources
    .map((chunk, index) => `${index + 1}. ${shortenText(chunk.text)}`)
    .join("\n");

  return {
    answer: `Кратко: по ЕПБТ найдено релевантное основание.\n\nОснование:\n${brief}\n\nПрактически:\n- При необходимости уточните вопрос (глубина, вид работ, пункт), чтобы получить более точный ответ.`,
    sources: shouldAttachSources ? buildSources(question, primarySources) : [],
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
    "Ты ассистент по ЕПБТ (РБ). Отвечай строго на основе переданных источников. " +
    "Не выдумывай нормы, пункты и факты. Если данных недостаточно, прямо скажи об этом. " +
    "Пиши понятным, человеческим языком, как опытный инструктор. " +
    "Добавляй 1-2 уместных эмодзи внутри предложений по смыслу (например рядом с важным действием/предупреждением), но без перегруза. " +
    "Не предлагай опасные или самовольные действия, если они не подтверждены источником как штатная процедура. " +
    "Для аварийных вопросов приоритет: команда руководителя спуска, действия страхующего водолаза и безопасное оказание помощи.";

  const hasContext = chunks.length > 0;
  const sourceInstruction = hasContext
    ? `Используй только эти источники:
${context}`
    : "Источники по запросу не найдены. Дай полезный краткий ответ без ссылок и без ссылок на пункты ЕПБТ.";

  const userPrompt = `Вопрос: ${question}

${sourceInstruction}

Сформируй ответ как цельный, короткий и понятный текст без секций/заголовков.
Ссылки и служебные пометки в тексте НЕ добавляй.
Если вопрос про порядок проведения работ, отвечай строго по схеме: кто назначается -> подготовка до спуска -> проведение -> контроль/документы.
Если вопрос про ответственных, обязательно назови конкретные роли, но только если они подтверждены источником.
Не давай общих определений, если вопрос про порядок/ответственных.
Не добавляй отдельную строку только из эмодзи и не ставь эмодзи отдельным хвостом в конце ответа.
Ограничения: не более 650 символов, без markdown-таблиц, без длинных цитат, без повторов вопроса.`;

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
  const shouldAttachSources = hasStrongSourceMatch(question, primarySources);

  return {
    answer,
    sources: shouldAttachSources ? buildSources(question, primarySources) : [],
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

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

async function bootstrapKnowledgeBase() {
  const raw = await readFile(KNOWLEDGE_BASE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    knowledgeBase = parsed;
    return;
  }

  if (parsed && typeof parsed === "object" && Array.isArray(parsed.chapters)) {
    knowledgeBase = mapEpbtStructuredToKnowledge(parsed);
    return;
  }

  throw new Error("Неподдерживаемый формат базы знаний. Используйте массив чанков или epbt-structured.json.");
}

await bootstrapKnowledgeBase();

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    if (req.method === "OPTIONS") {
      writeJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      writeJson(res, 200, {
        status: "ok",
        knowledgeChunks: knowledgeBase.length,
        llmConfigured: Boolean(OPENROUTER_API_KEY),
        model: OPENROUTER_MODEL,
      });
      return;
    }

    if (req.method === "POST" && req.url === "/assistant") {
      const body = await readBody(req);
      const question = typeof body?.question === "string" ? body.question.trim() : "";
      if (!question) {
        writeJson(res, 400, { error: "Поле question обязательно." });
        return;
      }

      const matchedChunks = retrieveChunks(question, 4);
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
  console.log(`LLM: ${OPENROUTER_API_KEY ? "enabled" : "fallback mode"} (${OPENROUTER_MODEL})`);
  if (OPENROUTER_API_KEY && OPENROUTER_MODEL_FALLBACKS.length) {
    console.log(`LLM fallbacks: ${OPENROUTER_MODEL_FALLBACKS.join(", ")}`);
  }
});
