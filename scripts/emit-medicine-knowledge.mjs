/**
 * Вынимает `export const diverMedicineBlocks = [ ... ]` из lib/diver-medicine-data.ts
 * и пишет public/assistant-sources/medicine/medicine-blocks.json (для ассистента и UI).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcPath = resolve(root, "lib/diver-medicine-data.ts");
const outPath = resolve(root, "public/assistant-sources/medicine/medicine-blocks.json");

function extractTopLevelJsonArray(text, searchFrom) {
  const i0 = text.indexOf("[", searchFrom);
  if (i0 < 0) return null;
  let depth = 0;
  let inString = null;
  let esc = false;
  for (let i = i0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === inString) inString = null;
      continue;
    }
    if (c === '"') {
      inString = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        return text.slice(i0, i + 1);
      }
    }
  }
  return null;
}

const src = readFileSync(srcPath, "utf8");
const marker = "export const diverMedicineBlocks";
const pos = src.indexOf(marker);
if (pos < 0) {
  console.error("emit-medicine-knowledge: не найдено diverMedicineBlocks");
  process.exit(1);
}
const eq = src.indexOf("=", pos);
const jsonSlice = extractTopLevelJsonArray(src, eq);
if (!jsonSlice) {
  console.error("emit-medicine-knowledge: не удалось выделить массив");
  process.exit(1);
}

const blocks = JSON.parse(jsonSlice);
if (!Array.isArray(blocks)) {
  console.error("emit-medicine-knowledge: ожидается массив");
  process.exit(1);
}

const out = { diverMedicineBlocks: blocks, generated: true, source: "lib/diver-medicine-data.ts" };
const dir = resolve(root, "public/assistant-sources/medicine");
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}
writeFileSync(outPath, JSON.stringify(out, null, 0) + "\n", "utf8");
console.log(`emit-medicine-knowledge: ${blocks.length} записей -> ${outPath}`);
