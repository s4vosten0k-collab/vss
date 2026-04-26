import WordExtractor from "word-extractor";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/dump-diver-diseases-doc.mjs <path-to.doc>");
  process.exit(1);
}

const extractor = new WordExtractor();
const doc = await extractor.extract(filePath);
const text = doc.getBody();
writeFileSync(join(__dirname, "diver-diseases-raw.txt"), text, "utf8");
console.log(text);
