# Backend Павлика (API помощника) на Render

Эта инструкция нужна, чтобы вкладка **Павлик** на сайте работала на хостинге так же, как локально.

## 1. Загрузить проект в GitHub

Загружайте исходный проект, но не загружайте секреты:

- `.env.local` не загружать;
- `.env` не загружать;
- `node_modules`, `.next`, `.next-dev`, `out` не загружать.

## 2. Создать сервис на Render

1. Откройте Render.
2. Нажмите **New** -> **Web Service**.
3. Подключите GitHub-репозиторий с проектом.
4. Настройки:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run assistant:start`
   - Health Check Path: `/health`

Если Render предложит использовать `render.yaml`, можно согласиться.

## 3. Переменные окружения Render

В разделе **Environment** добавьте:

```env
ASSISTANT_HOST=0.0.0.0
KNOWLEDGE_BASE_PATH=public/assistant-sources/epbt/epbt-structured.json
MEDICINE_KNOWLEDGE_PATH=public/assistant-sources/medicine/medicine-blocks.json
OPENROUTER_API_KEY=ваш_ключ_OpenRouter
OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
OPENROUTER_MODEL_FALLBACKS=openai/gpt-oss-120b:free,openai/gpt-oss-20b:free,google/gemma-3-12b-it:free,qwen/qwen3-coder:free,meta-llama/llama-3.3-70b-instruct:free
```

`PORT` добавлять не нужно: Render задаёт его сам.

## 4. Проверить backend

После запуска Render даст адрес вида:

```text
https://vss-vfl5.onrender.com
```

Проверьте в браузере или `curl`:

```text
https://vss-vfl5.onrender.com/health
```

Должен открыться JSON со `status: "ok"`, полем **`assistantServerRevision`**, а также **`knowledgeChunksMedicine`**. Если `knowledgeChunksMedicine` равен **0** (при `knowledgeChunks` около 500–700 только по ЕПБТ), в контексте ассистента **нет** мед. справочника — в ответах появляются только ссылки/фрагменты ЕПБТ. Исправление: **Manual Deploy** последнего коммита, в логе старта должна быть строка `мед. справочник: N чанков` (N > 0), в `package.json` команда `assistant:start` сначала запускает `emit-medicine-knowledge.mjs`. Если вместо JSON **404** — неверный URL или не тот сервис.

## 5. Пересобрать frontend под Render API

Когда backend заработал, локально в PowerShell:

```powershell
$env:NEXT_PUBLIC_ASSISTANT_API_URL="https://vss-vfl5.onrender.com/assistant"
npm.cmd run export:shared-hosting
Compress-Archive -Path "out\*" -DestinationPath "deploy-out.zip" -Force
```

После этого загрузите новое содержимое `out` или новый `deploy-out.zip` на `vsshelp.su`.

## 6. Проверка сайта

На `vsshelp.su` откройте вкладку **Павлик** и задайте вопрос.

Если Render бесплатный, первый ответ после простоя может идти дольше: сервис просыпается.

## 7. «Failed to fetch» / Павлик молчит в проде

Так браузер сообщает, что **запрос к API не дошёл** до нормального JSON-ответа: сеть, CORS, политика **Content-Security-Policy** (CSP) на стороне хостинга, блокировщик, старая **статика** с `localhost` в бандле.

1. **Пересоберите фронт** с `NEXT_PUBLIC_ASSISTANT_API_URL=https://vss-vfl5.onrender.com/assistant` и выложите `out` снова (см. раздел 5). В сессии PowerShell сбросьте переменную, если она указывает на другой URL: `Remove-Item Env:NEXT_PUBLIC_ASSISTANT_API_URL` перед сборкой, затем снова задайте URL и `npm run hosting:build`.

2. **Redeploy** web-сервиса на [Render](https://dashboard.render.com) с актуальным `assistant/server.mjs` (там CORS и обработка путей `/assistant` / `/health` с учётом слэшей). После деплоя проверьте `https://vss-vfl5.onrender.com/health` — должен быть JSON `ok`.

3. **CSP** в панели SprintHost / хоста: если задана политика безопасности, в директиве `connect-src` должны быть разрешены ваш домен (например `https://vsshelp.su`) и `https://vss-vfl5.onrender.com` (либо `https://*.onrender.com`). Иначе браузер запретит `fetch` к API.

4. **Режим сна** free Render: первый «пробой» — подождите 30–60 с и нажмите «Спросить Павлика» снова.
