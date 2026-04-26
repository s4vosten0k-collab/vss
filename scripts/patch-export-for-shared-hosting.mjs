import { promises as fs } from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("out");
const OLD_ASSET_DIR = "_next";
const NEW_ASSET_DIR = "next-assets";
const ASSET_SUBPATHS_FOR_HTACCESS = ["", "static", "static/chunks", "static/css"];
const HTACCESS_CONTENT = `DirectoryIndex index.html

<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js
  AddType application/json .json
  AddType application/manifest+json .webmanifest
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(css|js|json|map|webmanifest)$">
    Header set Access-Control-Allow-Origin "*"
  </FilesMatch>
</IfModule>

<IfModule mod_authz_core.c>
  <FilesMatch "\\.(css|js|json|map|webmanifest|svg|png|jpg|jpeg|gif|webp|ico|txt)$">
    Require all granted
  </FilesMatch>
</IfModule>

<IfModule !mod_authz_core.c>
  <FilesMatch "\\.(css|js|json|map|webmanifest|svg|png|jpg|jpeg|gif|webp|ico|txt)$">
    Allow from all
  </FilesMatch>
</IfModule>
`;

const ASSET_HTACCESS_CONTENT = `<IfModule mod_authz_core.c>
  Require all granted
</IfModule>

<IfModule !mod_authz_core.c>
  Allow from all
</IfModule>

<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
</IfModule>
`;

const TEXT_EXTENSIONS = new Set([".html", ".txt", ".js", ".css", ".json", ".webmanifest", ".map", ".xml"]);

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
      continue;
    }
    files.push(entryPath);
  }

  return files;
}

function patchText(content) {
  return content
    .replaceAll('"/_next/', `"/${NEW_ASSET_DIR}/`)
    .replaceAll("'/_next/", `'/${NEW_ASSET_DIR}/`)
    .replaceAll("(/_next/", `(/${NEW_ASSET_DIR}/`)
    .replaceAll("/_next/", `/${NEW_ASSET_DIR}/`);
}

async function main() {
  if (!(await exists(OUT_DIR))) {
    throw new Error("Папка out не найдена. Сначала выполните npm run export.");
  }

  const oldAssetsPath = path.join(OUT_DIR, OLD_ASSET_DIR);
  const newAssetsPath = path.join(OUT_DIR, NEW_ASSET_DIR);
  if (!(await exists(oldAssetsPath))) {
    throw new Error("В out отсутствует папка _next. Нечего патчить.");
  }

  if (await exists(newAssetsPath)) {
    await fs.rm(newAssetsPath, { recursive: true, force: true });
  }
  await fs.rename(oldAssetsPath, newAssetsPath);

  const files = await walkFiles(OUT_DIR);
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;

    const raw = await fs.readFile(filePath, "utf8");
    const patched = patchText(raw);
    if (patched !== raw) {
      await fs.writeFile(filePath, patched, "utf8");
    }
  }

  const htaccessPath = path.join(OUT_DIR, ".htaccess");
  await fs.writeFile(htaccessPath, HTACCESS_CONTENT, "utf8");

  const assetsRoot = path.join(OUT_DIR, NEW_ASSET_DIR);
  for (const relPath of ASSET_SUBPATHS_FOR_HTACCESS) {
    const targetDir = relPath ? path.join(assetsRoot, ...relPath.split("/")) : assetsRoot;
    if (!(await exists(targetDir))) continue;
    await fs.writeFile(path.join(targetDir, ".htaccess"), ASSET_HTACCESS_CONTENT, "utf8");
  }

  console.log(`Patched export for shared hosting: /_next -> /${NEW_ASSET_DIR}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

