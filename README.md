# Памятка водолаза (SPA)

SPA для водолазно-спасательной службы на Next.js 14 (App Router), адаптированное под мобильные устройства.

## Стек

- Next.js 14 + TypeScript
- Tailwind CSS
- UI-компоненты в стиле shadcn/ui
- Lucide React
- Framer Motion
- PWA manifest

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Навигация

Вкладки переключаются через query-параметр `?tab=...`, поэтому ссылкой можно делиться напрямую:

- `/handbook/?tab=docs`
- `/handbook/?tab=duties`
- `/handbook/?tab=callsigns`
- `/handbook/?tab=signals`
- `/handbook/?tab=medicine`
- `/handbook/?tab=tests`
- `/handbook/?tab=assistant`
- `/handbook/?tab=epbt`

## Павлик — помощник по ЕПБТ (RAG)

Вкладка **Павлик** (`?tab=assistant`) подключается к отдельному API-сервису, который:
- ищет релевантные фрагменты в `public/assistant-sources/epbt/epbt-structured.json` (ЕПБТ) и `public/assistant-sources/medicine/medicine-blocks.json` (мед. справочник),
- формирует ответ по найденным данным,
- возвращает подтверждающие источники (документ, раздел, пункт, цитата).

### Локальный запуск API для Павлика

1. Скопируйте `.env.example` в `.env.local` и при необходимости измените значения.
2. Запустите backend:

   ```bash
   npm run assistant:dev
   ```

3. В другом терминале запустите сайт:

   ```bash
   npm run dev
   ```

По умолчанию фронтенд отправляет запросы на `http://127.0.0.1:8787/assistant`.

### Режимы работы API

- **Fallback-режим (без ключа):** ответ формируется только из найденных фрагментов локальной базы.
- **LLM-режим (с ключом):** при `OPENROUTER_API_KEY` используется DeepSeek через OpenRouter, но с теми же источниками из локальной базы.

Проверьте API:

```bash
curl http://127.0.0.1:8787/health
```

## Сборка для хостинга

Проект — статический экспорт (`output: "export"`), публикуется папка `out` (корень веб-директории, без Node.js на сервере).

### Быстрый чек перед выкладкой

```bash
npm install
npm run hosting:check
```

Проверяет линт и чистую сборку `next build`.

### Сборка с патчем под Apache (SprintHost и аналоги)

На части shared-хостингов папка `_next` может блокироваться. Скрипт переименует её в `next-assets` и допишет `.htaccess`.

```bash
# Задайте URL API Павлика (см. .env.production.example), затем:
npm run hosting:build
# или: npm run export:shared-hosting
```

Публикуйте **содержимое** папки `out` (файл `.htaccess` в корне `out` тоже нужен).

### Переменные при сборке

- **`NEXT_PUBLIC_ASSISTANT_API_URL`** — публичный URL API (тот же endpoint `/assistant`). Задайте в `.env.production.local` (шаблон: `.env.production.example`) или в CI **до** `npm run build`, иначе во фронт попадёт `localhost` и Павлик на сайте не подключится.
- **`NEXT_PUBLIC_BASE_PATH`** — только если сайт в подкаталоге, например `https://домен/vss/`: значение `vss` без слэшей.

### Архив для загрузки

Одной командой (сборка, патч Apache, zip в корне проекта):

```bash
npm run hosting:package
```

Или только zip, если папка `out` уже собрана:

```bash
npm run hosting:zip
```

**Windows (PowerShell), вручную** после `npm run hosting:build`:

```powershell
Compress-Archive -Path (Join-Path (Get-Location) "out\*") -DestinationPath (Join-Path (Get-Location) "deploy-out.zip") -Force
```

Получится `deploy-out.zip` (в `.gitignore`), распакуйте **содержимое** в web-каталог на хостинге.

## SprintHost: как залить сайт

1. Скопируйте `.env.production.example` в `.env.production.local` и укажите `NEXT_PUBLIC_ASSISTANT_API_URL` на ваш API.
2. В панели SprintHost откройте сайт/домен, куда хотите загрузить проект.
3. Откройте файловый менеджер и перейдите в корневую web-папку домена (обычно `public_html` или `www`).
4. Удалите старое содержимое сайта (если оно не нужно).
5. Локально в проекте выполните:

   ```bash
   npm install
   npm run hosting:build
   ```

6. Загрузите **содержимое** папки `out` в web-папку домена (вместе с `.htaccess` в корне; не загружайте пустой каталог `out` как одну папку без файлов).
7. Проверьте сайт: главная и `/handbook/` должны открываться без Node.js на сервере.

Подробнее: [DEPLOY_SPRINTHOST.md](DEPLOY_SPRINTHOST.md). Если после обновления не видно изменений — сброс кэша браузера (Ctrl+F5) и, при необходимости, CDN в панели.
