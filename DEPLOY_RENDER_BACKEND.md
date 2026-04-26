# Backend Максимки на Render

Эта инструкция нужна, чтобы помощник работал на хостинге так же, как локально.

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
KNOWLEDGE_BASE_PATH=public/docs/epbt-structured.json
OPENROUTER_API_KEY=ваш_ключ_OpenRouter
OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
OPENROUTER_MODEL_FALLBACKS=openai/gpt-oss-120b:free,openai/gpt-oss-20b:free,google/gemma-3-12b-it:free,qwen/qwen3-coder:free,meta-llama/llama-3.3-70b-instruct:free
```

`PORT` добавлять не нужно: Render задаёт его сам.

## 4. Проверить backend

После запуска Render даст адрес вида:

```text
https://vss-maximka-api.onrender.com
```

Проверьте:

```text
https://vss-maximka-api.onrender.com/health
```

Должен открыться JSON со статусом `ok`.

## 5. Пересобрать frontend под Render API

Когда backend заработал, локально в PowerShell:

```powershell
$env:NEXT_PUBLIC_ASSISTANT_API_URL="https://vss-maximka-api.onrender.com/assistant"
npm.cmd run export:shared-hosting
Compress-Archive -Path "out\*" -DestinationPath "deploy-out.zip" -Force
```

После этого загрузите новое содержимое `out` или новый `deploy-out.zip` на `vsshelp.su`.

## 6. Проверка сайта

На `vsshelp.su` откройте вкладку `Помощник` и задайте вопрос.

Если Render бесплатный, первый ответ после простоя может идти дольше: сервис просыпается.
