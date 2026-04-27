import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");
const zipName = "deploy-out.zip";
const zipPath = path.join(root, zipName);

if (!existsSync(outDir)) {
  console.error("Папка out не найдена. Сначала: npm run hosting:build");
  process.exit(1);
}

if (existsSync(zipPath)) {
  try {
    unlinkSync(zipPath);
  } catch {
    // ignore
  }
}

if (process.platform === "win32") {
  const outQuoted = outDir.replace(/'/g, "''");
  const zipQuoted = zipPath.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${outQuoted}\\*' -DestinationPath '${zipQuoted}' -Force"`,
    { stdio: "inherit", shell: true }
  );
} else {
  execSync(`cd "${outDir}" && zip -r -q "${zipPath}" .`, { stdio: "inherit", shell: true });
}

console.log(`\nАрхив: ${zipPath}\nРаспакуйте в корень public_html (содержимое архива = корень сайта).`);
