const fs = require("fs");
const path = require("path");
const WordExtractor = require("word-extractor");

function normalizeText(input) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSummary(content) {
  const summarySource =
    content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 20) || "Полный текст раздела доступен в документе.";
  return summarySource.length > 160 ? `${summarySource.slice(0, 157)}...` : summarySource;
}

function extractChaptersFromText(sourceText, idPrefix, dedupeByNumber) {
  const chapterRegex = /^Глава\s+\d+\.[^\n]*$/gm;
  const starts = [...sourceText.matchAll(chapterRegex)].map((match) => match.index ?? 0);
  const sections = [];
  const seenNumbers = new Set();

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = i < starts.length - 1 ? starts[i + 1] : sourceText.length;
    const block = sourceText.slice(start, end).trim();
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const titleLines = [];
    let cursor = 0;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (cursor > 0 && /^\d+\./.test(line)) break;
      if (/^Раздел\s+/i.test(line)) break;
      titleLines.push(line);
      cursor += 1;
      if (cursor >= 4) break;
    }

    const title = titleLines.join(" ").replace(/\s+/g, " ").trim();
    const numberMatch = title.match(/^Глава\s+(\d+)\./);
    if (!numberMatch) continue;

    if (/[.….]{5,}\s*\d+\s*$/u.test(title) || /Приложение\s+\d+/i.test(title)) continue;
    const number = Number(numberMatch[1]);
    if (dedupeByNumber && seenNumbers.has(number)) continue;
    if (dedupeByNumber) seenNumbers.add(number);

    const content = lines.slice(cursor).join("\n").trim();
    sections.push({
      id: `${idPrefix}-chapter-${number}-${i}`,
      kind: "chapter",
      number,
      title,
      summary: getSummary(content),
      content,
    });
  }

  return sections;
}

function getAppendixDisplayTitle(block, appendixNumber) {
  const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
  const contentHeader = lines.find(
    (line) =>
      !/^Приложение\s+\d+/i.test(line) &&
      !/^к Единым правилам/i.test(line) &&
      !/^труда на водолазных работах/i.test(line) &&
      !/^Республике Беларусь/i.test(line)
  );
  if (!contentHeader) return `Приложение ${appendixNumber}`;
  const clean = contentHeader.replace(/\s+/g, " ").trim();
  return `Приложение ${appendixNumber}. ${clean}`;
}

function buildSections(text) {
  const appendixHeaderRegex = /^\s*Приложение\s+(\d+)\s*$/gm;
  const appendixHeaders = [...text.matchAll(appendixHeaderRegex)].map((match) => ({
    number: Number(match[1]),
    index: match.index ?? 0,
  }));

  const firstAppendixIndex = appendixHeaders.length > 0 ? appendixHeaders[0].index : text.length;
  const mainPart = text.slice(0, firstAppendixIndex).trim();
  const mainChapters = extractChaptersFromText(mainPart, "main", true);

  const preface = mainChapters.length > 0 ? mainPart.slice(0, mainPart.indexOf(mainChapters[0].title)).trim() : mainPart;
  const chapters = [...mainChapters];

  for (let i = 0; i < appendixHeaders.length; i += 1) {
    const header = appendixHeaders[i];
    if (header.number < 2) continue;

    const blockStart = header.index;
    const blockEnd = i < appendixHeaders.length - 1 ? appendixHeaders[i + 1].index : text.length;
    const block = text.slice(blockStart, blockEnd).trim();
    const appendixTitle = getAppendixDisplayTitle(block, header.number);
    const appendixId = `appendix-${header.number}-${i}`;

    chapters.push({
      id: appendixId,
      kind: "appendix",
      number: null,
      appendixNumber: header.number,
      title: appendixTitle,
      summary: "Начало приложения. Нажмите, чтобы открыть полный текст.",
      content: block,
    });

    const appendixChapterSections = extractChaptersFromText(block, appendixId, false).map((section, idx) => ({
      ...section,
      kind: "appendix-chapter",
      id: `${appendixId}-section-${idx + 1}`,
      title: `Приложение ${header.number} — ${section.title}`,
    }));
    chapters.push(...appendixChapterSections);
  }

  return {
    preface,
    chapters,
  };
}

async function main() {
  const sourcePath = path.resolve(process.cwd(), "public/assistant-sources/epbt/epbt.doc");
  const outputPath = path.resolve(process.cwd(), "public/assistant-sources/epbt/epbt-structured.json");
  const extractor = new WordExtractor();
  const doc = await extractor.extract(sourcePath);
  const rawText = doc.getBody();
  const text = normalizeText(rawText);
  const sections = buildSections(text);

  fs.writeFileSync(outputPath, JSON.stringify(sections, null, 2), "utf8");
  console.log(`Saved: ${outputPath}`);
  console.log(`Chapters: ${sections.chapters.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
