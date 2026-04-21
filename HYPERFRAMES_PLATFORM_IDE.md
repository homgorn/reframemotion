# HyperFrames Platform — Полная инструкция для IDE
> Claude Code · Cursor · Windsurf · Copilot  
> Версия: 1.0 | Апрель 2026 | Базируется на v0.4.4

---

## КРИТИЧЕСКИ ВАЖНО — ПРОЧТИ ПЕРВЫМ

Это форк `heygen-com/hyperframes` (Apache 2.0). Мы строим **HyperFrames Platform** поверх OSS ядра:
- **Не трогай** `packages/core`, `packages/engine`, `packages/shader-transitions` — это upstream
- **Расширяй** `packages/studio`, `packages/cli` — добавляем auth/jobs/bulk
- **Строй новое** в `packages/api`, `packages/worker`, `packages/mcp`

Мы — `@leonid` (solo dev, Kyrgyzstan). Стиль работы: агент-first, прагматично, быстро в продакшн.

---

## 1. СТРУКТУРА МОНОРЕПО

```
hyperframes-platform/
├── packages/
│   ├── core/               ← UPSTREAM. НЕ ТРОГАТЬ.
│   ├── engine/             ← UPSTREAM. НЕ ТРОГАТЬ.
│   ├── shader-transitions/ ← UPSTREAM. НЕ ТРОГАТЬ.
│   ├── producer/           ← UPSTREAM + ./server Hono export = SEED BACKEND
│   ├── player/             ← UPSTREAM. Embeddable <hyperframes-player>
│   ├── cli/                ← РАСШИРЯЕМ: +bulk --variables-file, +mcp команда
│   ├── studio/             ← РАСШИРЯЕМ: +auth, +jobs panel, +asset manager
│   ├── api/                ← НОВЫЙ. REST API сервер (Hono + JWT)
│   ├── worker/             ← НОВЫЙ. BullMQ worker + browser pool
│   └── mcp/                ← НОВЫЙ. MCP server для агентов
├── registry/               ← UPSTREAM. 50+ blocks
├── skills/                 ← UPSTREAM + наши кастомные skills
├── scripts/                ← UPSTREAM automation
├── docs/                   ← UPSTREAM + наша документация
├── infra/                  ← НОВЫЙ. Docker, k8s, Terraform
└── docker-compose.platform.yml ← НОВЫЙ
```

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Верхний уровень
```
Язык:       TypeScript (strict, no any, no as T)
Runtime:    Node.js >= 22 (движок), Bun (монорепо/dev)
Package:    bun workspaces (НЕ pnpm, НЕ npm install --workspaces)
Build:      tsup (packages), Vite (studio)
Test:       vitest
Lint:       oxlint (НЕ eslint)
Format:     oxfmt (НЕ prettier, НЕ biome)
Git hooks:  lefthook (auto lint+format pre-commit)
Commits:    Conventional Commits (feat/fix/docs/refactor/test/chore)
```

### Core engine (read-only knowledge)
```
Render:     Puppeteer + Chrome BeginFrame API
Encode:     FFmpeg (FrameCapture → PNG/JPEG → MP4/WebM)
Audio:      FFmpeg audio mixer (multi-track, per-element volume)
Animation:  GSAP 3.14.2 (pinned), Lottie, CSS, Three.js via Frame Adapters
Timing:     Deterministic — frame = floor(time * fps), no wall-clock
Parallel:   parallelCoordinator.ts — CPU/RAM aware auto-scaling
GPU:        gpuEncoder.ts — h264_nvenc/h264_videotoolbox detection
Streaming:  streamingEncoder.ts — pipe frames without disk
Browser pool: PRODUCER_ENABLE_BROWSER_POOL=true (env var flag, default false)
```

### Новые пакеты
```
packages/api:    Hono v4 + JWT auth + zod validation
packages/worker: BullMQ v5 + ioredis + Puppeteer pool
packages/mcp:    @modelcontextprotocol/sdk (stdio transport)
```

### Dashboard (Studio extended)
```
Framework:  React 19 + Vite 6
State:      Zustand 5
Editor:     CodeMirror 6 (HTML/CSS/JS)
Icons:      @phosphor-icons/react
Animation:  motion (Framer Motion 12)
Styles:     Tailwind CSS 3 (utility-first)
Build:      Vite
```

---

## 3. КОМАНДЫ РАЗРАБОТКИ

```bash
# Установка
bun install                    # НЕ pnpm install — создаст pnpm-lock.yaml

# Сборка
bun run build                  # Все пакеты
bun run --filter @hyperframes/core build
bun run --filter @hyperframes/producer build

# Dev режим
bun run studio                 # Studio UI на localhost:3000 + hot reload
bun run --filter packages/api dev  # API server на localhost:3001

# Тесты
bun run test                   # Все (кроме producer — медленный)
bun run --filter @hyperframes/core test:hyperframe-runtime-ci
bun run --filter @hyperframes/producer test  # Visual regression (медленно)

# Линт и форматирование
bunx oxlint .                  # Lint
bunx oxfmt .                   # Format
bun run lint                   # + skill linting
bun run format:check           # CI check

# HyperFrames CLI
npx hyperframes init my-video --non-interactive
npx hyperframes lint
npx hyperframes validate       # Runtime check + WCAG contrast
npx hyperframes preview        # Studio + hot reload на :3002
npx hyperframes render --quality draft --output out.mp4
npx hyperframes render --docker # Reproducible
npx hyperframes tts "text" --voice af_nova --output narration.wav
npx hyperframes transcribe audio.mp3
npx hyperframes doctor         # Environment check
npx hyperframes benchmark .    # Perf test

# MCP server (после сборки)
npx hyperframes mcp            # Запустить как MCP server
```

---

## 4. ДОБАВЛЕНИЕ НОВЫХ КОМАНД CLI

**Всегда следовать этому паттерну (из CLAUDE.md):**

1. Создать `packages/cli/src/commands/<name>.ts` с `defineCommand` из citty
2. Экспортировать `examples: Example[]` в том же файле
3. Зарегистрировать в `packages/cli/src/cli.ts` под `subCommands` (lazy-loaded)
4. Добавить в `packages/cli/src/help.ts` в нужную группу GROUPS
5. Задокументировать в `docs/packages/cli.mdx`
6. Проверить: `npx tsx packages/cli/src/cli.ts --help` + `npx tsx packages/cli/src/cli.ts <name> --help`

---

## 5. КЛЮЧЕВЫЕ ПРАВИЛА РАЗРАБОТКИ

### TypeScript
```typescript
// ✅ ПРАВИЛЬНО
function parseHtml(html: string): ParsedHtml { ... }
const isText = (el: unknown): el is TextElement => el instanceof HTMLElement

// ❌ ЗАПРЕЩЕНО
const result = doSomething() as ParsedHtml  // as T assertions
const val: any = getValue()                  // any тип
```

### Compositions (HTML видео)
```
// Обязательные правила:
- Каждый clip нужен class="clip" + data-start + data-track-index
- window.__timelines["<composition-id>"] = tl (всегда регистрировать)
- GSAP timeline: { paused: true }
- НЕТ Math.random(), Date.now(), unseeded randomness
- НЕТ repeat: -1 на GSAP
- Video всегда muted playsinline + отдельный <audio> для звука
- НЕТ <br> в тексте — использовать max-width + flex wrap
- Сначала layout (статический CSS), потом animation (gsap.from → gsap.to)
```

### Engine конфигурация (через env vars)
```bash
# Производительность
PRODUCER_ENABLE_BROWSER_POOL=true  # ← Включить browser pool (DEFAULT: false)
PRODUCER_MAX_WORKERS=4              # Параллельные workers (default: auto)
PRODUCER_CORES_PER_WORKER=2.5       # CPU на worker для auto-scaling
PRODUCER_ENABLE_CHUNKED_ENCODE=true # Chunked encoding для длинных видео
PRODUCER_ENABLE_STREAMING_ENCODE=true # Streaming без диска

# Browser
PRODUCER_HEADLESS_SHELL_PATH=/path/to/chrome
PRODUCER_DISABLE_GPU=false
PRODUCER_PUPPETEER_LAUNCH_TIMEOUT_MS=120000
PRODUCER_FORCE_SCREENSHOT=false     # Пропустить BeginFrame → slower

# Debug
PRODUCER_VERIFY_HYPERFRAME_RUNTIME=false  # Отключить SHA256 check в dev
```

---

## 6. PACKAGES/API — REST API (НОВЫЙ)

### Структура
```
packages/api/
├── src/
│   ├── index.ts          ← Hono app entry point
│   ├── routes/
│   │   ├── render.ts     ← POST /render, GET /jobs/:id, POST /render/bulk
│   │   ├── compositions.ts ← CRUD для templates
│   │   ├── assets.ts     ← S3/MinIO asset management
│   │   └── auth.ts       ← POST /auth/login, POST /auth/register
│   ├── middleware/
│   │   ├── jwt.ts        ← JWT auth middleware
│   │   ├── rateLimiter.ts ← rate-limiter-flexible (protect render endpoint)
│   │   └── validate.ts   ← zod request validation
│   ├── queue/
│   │   ├── renderQueue.ts ← BullMQ Queue setup
│   │   └── jobEvents.ts  ← webhook triggers on job complete
│   ├── storage/
│   │   └── s3.ts         ← @aws-sdk/client-s3 (MinIO compatible)
│   └── db/
│       ├── schema.ts     ← Drizzle ORM schema
│       └── client.ts     ← Postgres connection
├── package.json
└── Dockerfile
```

### Ключевые эндпоинты
```typescript
POST /render
  body: { compositionHtml: string, variables?: Record<string, unknown>, outputFormat?: 'mp4'|'webm', quality?: 'draft'|'standard'|'high' }
  returns: { jobId: string, status: 'queued' }
  auth: Bearer JWT
  rate: 10/min per user

GET /jobs/:id
  returns: { jobId, status: 'queued'|'processing'|'complete'|'failed', outputUrl?: string, error?: string, progress?: number }
  auth: Bearer JWT

POST /render/bulk
  body: { templateHtml: string, variablesSets: Array<Record<string, unknown>> }
  returns: { jobIds: string[], batchId: string }
  auth: Bearer JWT
  rate: 2 batch/min per user

GET /compositions              ← List templates
POST /compositions             ← Save template
PUT /compositions/:id          ← Update template
DELETE /compositions/:id       ← Delete

POST /assets/upload            ← Presigned S3 upload URL
GET /assets                    ← List user assets

POST /auth/login               ← JWT token
POST /auth/register
POST /auth/refresh
```

### Зависимости
```json
{
  "hono": "^4.0.0",
  "@hono/node-server": "^1.8.0",
  "hono/jwt": "built-in",
  "bullmq": "^5.0.0",
  "ioredis": "^5.0.0",
  "drizzle-orm": "^0.30.0",
  "postgres": "^3.4.0",
  "@aws-sdk/client-s3": "^3.600.0",
  "zod": "^3.23.0",
  "rate-limiter-flexible": "^5.0.0",
  "@hyperframes/core": "workspace:*",
  "@hyperframes/producer": "workspace:*"
}
```

---

## 7. PACKAGES/WORKER — RENDER WORKER (НОВЫЙ)

### Архитектура
```
packages/worker/
├── src/
│   ├── index.ts           ← Worker entry, BullMQ setup
│   ├── browserPool.ts     ← Pre-warm + reuse Puppeteer instances
│   ├── renderJob.ts       ← Выполнение одного render job
│   ├── assetDownloader.ts ← Скачать assets из URLs перед рендером
│   └── metrics.ts         ← OpenTelemetry / pino logging
├── package.json
└── Dockerfile
```

### Browser Pool — критически важно
```typescript
// КЛЮЧЕВОЕ: НЕ создавать новый браузер на каждый рендер
// Используем PRODUCER_ENABLE_BROWSER_POOL=true + держим инстансы живыми

// browserPool.ts
interface BrowserInstance {
  browser: Browser
  busy: boolean
  rendersCount: number
  createdAt: Date
}

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE ?? '4')
const MAX_RENDERS_PER_BROWSER = 50  // перезапуск после N рендеров (memory leak prevention)

export async function acquireFromPool(): Promise<BrowserInstance>
export async function releaseToPool(instance: BrowserInstance): Promise<void>
export async function initPool(): Promise<void>
```

### Переменные окружения
```bash
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://hf:hf@postgres:5432/hyperframes
S3_ENDPOINT=http://minio:9000
S3_BUCKET=hyperframes-renders
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
BROWSER_POOL_SIZE=4
RENDER_CONCURRENCY=4
PRODUCER_ENABLE_BROWSER_POOL=true  ← ОБЯЗАТЕЛЬНО для pooling
MAX_RENDER_MINUTES=10               ← Защита от abuse
WEBHOOK_SECRET=secret               ← HMAC подпись webhooks
```

---

## 8. PACKAGES/MCP — MCP SERVER (НОВЫЙ)

### Tools для агентов
```typescript
// packages/mcp/src/index.ts

server.tool('render', 'Render HyperFrames HTML to MP4', {
  htmlPath: z.string(),          // или
  htmlContent: z.string(),       // inline HTML строка
  outputPath: z.string().optional(),
  quality: z.enum(['draft','standard','high']).default('draft'),
  variables: z.record(z.unknown()).optional()
})

server.tool('lint', 'Lint composition for errors', {
  htmlPath: z.string()
  // returns: { errors, warnings, infos }
})

server.tool('validate', 'Runtime validate (Chrome headless)', {
  htmlPath: z.string(),
  checkContrast: z.boolean().default(true)
  // returns: { errors, contrastWarnings }
})

server.tool('preview', 'Start preview server', {
  projectDir: z.string(),
  port: z.number().optional()
  // returns: { url: 'http://localhost:3002' }
})

server.tool('add_block', 'Install block from catalog', {
  blockName: z.string(),        // e.g. 'instagram-follow'
  targetDir: z.string().optional()
})

server.tool('list_blocks', 'List available catalog blocks', {
  type: z.enum(['block','component','example']).optional()
  // returns: registry.json items
})

server.tool('init', 'Scaffold new composition project', {
  name: z.string(),
  template: z.string().default('blank'),
  targetDir: z.string()
})

server.tool('bulk_render', 'Render multiple videos from template + variables', {
  templatePath: z.string(),
  variablesPath: z.string(),  // JSON file: [{...}, {...}]
  outputDir: z.string(),
  concurrency: z.number().default(2)
})
```

### Установка в Claude Desktop / Claude Code
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "hyperframes": {
      "command": "node",
      "args": ["/path/to/hyperframes-platform/packages/mcp/dist/index.js"],
      "env": {
        "PRODUCER_ENABLE_BROWSER_POOL": "true"
      }
    }
  }
}
```

```bash
# Или через npx (когда опубликуем)
npx hyperframes mcp
```

---

## 9. STUDIO EXTENSIONS — ЧТО ДОБАВИТЬ

### Новые Zustand store slices
```typescript
// packages/studio/src/store/auth.ts
interface AuthStore {
  user: { id: string; email: string; credits: number } | null
  token: string | null
  login(email: string, password: string): Promise<void>
  logout(): void
  refreshToken(): Promise<void>
}

// packages/studio/src/store/jobs.ts
interface Job { id: string; status: 'queued'|'processing'|'complete'|'failed'; outputUrl?: string; createdAt: Date }
interface JobsStore {
  jobs: Job[]
  activeJob: string | null
  fetchJobs(): Promise<void>
  submitRender(html: string, options?: RenderOptions): Promise<string>
  pollJob(jobId: string): void
}

// packages/studio/src/store/assets.ts
interface AssetsStore {
  assets: Asset[]
  uploadAsset(file: File): Promise<string>  // returns URL
  deleteAsset(id: string): Promise<void>
}
```

### Новые панели (добавить в Studio sidebar)
```
packages/studio/src/panels/
├── JobHistory.tsx      ← Таблица рендеров: статус, превью-thumbnail, скачать MP4
├── AssetManager.tsx    ← S3-backed: загрузить/просмотреть/удалить assets
├── CatalogBrowser.tsx  ← Просмотр и установка registry blocks (50+)
├── UsageMeter.tsx      ← Credits: потрачено/осталось, plan info
├── TemplateManager.tsx ← Сохранить/загрузить шаблоны compositions
└── BulkRender.tsx      ← Upload CSV/JSON → bulk render N видео
```

### Расширение auth flow
```
packages/studio/src/pages/
├── Login.tsx           ← Email/password + JWT сохранить в localStorage
├── Register.tsx        ← Регистрация
└── ApiKeys.tsx         ← Управление API ключами для прямого API доступа
```

---

## 10. REMOTION INTEGRATION

### Когда использовать HyperFrames vs Remotion

| | HyperFrames | Remotion |
|---|---|---|
| **Генерация агентом** | ✅ Нативная (plain HTML) | ⚠️ Нужен React skill |
| **React экосистема** | ❌ Не нужна | ✅ Родная |
| **Облачный рендер** | ❌ Нет (строим) | ✅ Lambda |
| **Лицензия** | Apache 2.0 | Платная для 4+ чел. |
| **Animations** | GSAP, Lottie, CSS, WebGL | React + useCurrentFrame() |
| **TTS встроен** | ✅ Kokoro-82M | ❌ Нужен ElevenLabs/Deepgram |
| **MCP server** | ✅ Строим | ✅ remotion-video-mcp |

### Гибридная схема (HyperFrames → Remotion Lambda)
```typescript
// packages/integrations/remotion-bridge.ts
// Сценарий: HyperFrames генерирует HTML, Remotion рендерит в AWS Lambda

import { renderMediaOnLambda } from '@remotion/lambda'

export async function renderViaRemotionLambda(hfHtmlPath: string) {
  // 1. HyperFrames composition как <IFrame> в Remotion
  // 2. Remotion Lambda рендерит через AWS (параллельные chunks)
  // 3. Возвращает S3 URL готового MP4

  const result = await renderMediaOnLambda({
    region: 'us-east-1',
    functionName: 'remotion-render-fn',
    composition: 'HyperframesWrapper',
    inputProps: {
      hyperframesUrl: `${FILE_SERVER_URL}/${hfHtmlPath}`
    },
    codec: 'h264',
    imageFormat: 'jpeg',
  })
  return result.outputFile
}
```

### Установка Remotion skill для Claude Code
```bash
# Официальный skill от Remotion (январь 2026, 25k+ installs)
npx skills add remotion-dev/skills

# MCP server для Remotion в Claude Desktop
# https://github.com/dev-arctik/remotion-video-mcp
git clone https://github.com/dev-arctik/remotion-video-mcp.git
cd remotion-video-mcp && npm install && npm run build
# добавить в claude_desktop_config.json
```

### Когда использовать Remotion в нашем контексте
- Нужен cloud render на Lambda (масштаб 1000+ рендеров/час)
- Есть React-разработчики в команде  
- Нужны React компоненты (recharts, three/fiber, react-spring)
- Лицензия HyperFrames 4+ сотрудников `$100/мес` vs Apache 2.0 HyperFrames

**Лицензия предупреждение:** Remotion требует платную лицензию ($100/мес) для компаний 4+ сотрудников. Для solo dev — бесплатно. Apache 2.0 HyperFrames выигрывает если строишь SaaS.

---

## 11. ИНТЕГРАЦИИ — ROADMAP МОДУЛИ

### М1: WayinVideo API (post-render, ~3 дня)
```typescript
// packages/integrations/wayin.ts
// После render: автонарезка на 9:16 shorts

interface WayinClipOptions {
  videoUrl: string         // Public URL готового MP4
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5'
  language?: string        // 'ru', 'en', 'zh', 100+ langs
  maxClips?: number        // Ограничить количество клипов
}

// Available NOW: AI Clipping, Find Moments, Transcription, Summarization
// Coming: Animated Captions, AI Reframe, Subtitle Translation
// Pricing: pay-as-go от $10, Enterprise custom
// API docs: wayin.ai/api-docs/

export async function clipToShorts(options: WayinClipOptions): Promise<ClipResult[]>
export async function findMoments(videoUrl: string, query: string): Promise<Moment[]>
export async function transcribeVideo(videoUrl: string): Promise<Transcript>
```

```bash
# CLI интеграция: новый флаг
npx hyperframes render --output video.mp4 --post-clip-shorts --wayin-key $KEY
npx hyperframes render --output video.mp4 --post-transcribe
```

### М2: HeyGen Avatar (AI avatars, ~2 дня skill)
```bash
# HeyGen Remote MCP (OAuth, не нужен API key!)
# docs: docs.heygen.com/docs/heygen-remote-mcp-server
# Добавить в claude_desktop_config.json как MCP server
# Claude Code сам вызовет HeyGen API для генерации avatar clip

# Skill update: skills/hyperframes/references/heygen-avatar.md
# Описать как агент должен:
# 1. Вызвать HeyGen Remote MCP tool → получить video URL
# 2. Добавить как <video data-src="..."> в composition
# 3. Синхронизировать с audio timeline через data-start/data-duration
```

### М3: AI Video Generation (B-roll injection, ~1 неделя)
```typescript
// packages/integrations/video-gen.ts
// Провайдеры для AI B-roll

interface VideoGenProvider {
  name: 'wan27' | 'kling30' | 'runway-gen4' | 'sora2'
  generate(prompt: string, options: GenOptions): Promise<string>  // returns video URL
}

// Wan 2.7: $0.94/clip 1080p, audio sync, segmind.com
// Kling 3.0: 4K/60fps, multi-shot, лучший для рекламы
// Runway Gen-4: наиболее полированный, $0.05/сек
// Sora 2: до 25 секунд, интегрированный audio, только ChatGPT Pro

// Использование: агент описывает сцену → генерирует B-roll → вставляет в composition
```

### М4: Shotstack Integration (cloud render, ~1 неделя)
```typescript
// packages/integrations/shotstack.ts
// Shotstack: cloud rendering API (JSON-based, не HTML)
// Когда нужен: если не хотим держать Puppeteer инфраструктуру

// Shotstack имеет MCP server! docs.shotstack.io/mcp
// $0.20-0.30 за рендер-минуту (credit-based)
// White-label video editor SDK
// ProRes alpha support, chroma key

// Идея: HF генерирует HTML → конвертируем в Shotstack JSON → cloud render
// ИЛИ: предоставить Shotstack как опцию для --cloud флага в CLI
```

### М5: Creatomate SDK (template marketplace, ~2 недели)
```typescript
// Creatomate: самый быстрый render (< 15сек), API-first, $41/мес
// Сценарий: HF шаблоны экспортируем в Creatomate format для совместимости
// packages/integrations/creatomate-export.ts
// Конвертировать HyperFrames HTML composition → Creatomate JSON template
```

### М6: Social Distribution (publish pipeline, ~1 неделя)
```typescript
// packages/integrations/social.ts
// После render+clip → автопубликация

interface SocialPublisher {
  publishToYouTubeShorts(clipUrl: string, metadata: YouTubeMetadata): Promise<string>
  publishToTikTok(clipUrl: string, metadata: TikTokMetadata): Promise<string>
  publishToInstagramReels(clipUrl: string, metadata: IGMetadata): Promise<string>
  publishToLinkedIn(videoUrl: string, text: string): Promise<string>
}

// APIs:
// YouTube Data API v3 (OAuth 2.0, free quota)
// TikTok Content Posting API (developer.tiktok.com)
// Meta Graph API (Instagram + Facebook)
// LinkedIn Video API (для B2B контента)
```

### М7: n8n Native Integration (~3 дня)
```typescript
// WayinVideo уже интегрирован с n8n нативно
// Нам нужен n8n node для hyperframes-api

// packages/n8n-node/
// - HyperFrames trigger: webhook от finished render
// - HyperFrames action: submit render, bulk render
// - Публикация в n8n community nodes
```

### М8: Billing & Credits (Stripe, ~1 неделя)
```typescript
// packages/billing/
// Stripe Checkout + webhook
// Credit packs: Starter $10 (200 рендер-мин), Pro $49 (1000), Enterprise custom
// Middleware проверяет credits перед render job
// Drizzle schema: users.credits, transactions
```

### М9: Analytics & Observability (~3 дня)
```typescript
// packages/analytics/
// OpenTelemetry traces для render pipeline
// Метрики: p50/p95 render time, failure rate, credit consumption
// Pino для structured logging
// Grafana/Prometheus или Axiom (hosted)
```

### М10: White-label Studio (~2 недели)
```typescript
// Позволить клиентам брендировать Studio под свой домен
// packages/studio расширяется:
// - Theme config (CSS variables override)
// - Custom logo + domain
// - Restricted block catalog (только выбранные)
// - Webhook к клиентскому бэкенду
```

### М11: Video Templates Marketplace (~3 недели)
```typescript
// Магазин templates поверх registry
// - Платные templates (авторы получают % от рендеров)
// - Рейтинги, превью, categories
// - hyperframes add <template> → billing event
// - Аналог Envato/ThemeForest но для HTML video templates
```

---

## 12. КОНКУРЕНТНЫЙ ЛАНДШАФТ (для позиционирования)

### Прямые конкуренты
| Продукт | Stack | Цена | Дифференциация |
|---------|-------|------|---------------|
| Shotstack | JSON API | $0.25/мин | Cloud-native, white-label SDK |
| Creatomate | JSON API | $0.15/мин | Responsive templates, fast (<15s) |
| Plainly | After Effects | $69/мес | AE template automation |
| Remotion | React | $100/мес 4+ | Code-as-video, OSS |

### Наша дифференциация
- **HTML-native**: агенты пишут HTML — не JSON, не React, не AE
- **Apache 2.0**: полностью open source, self-host
- **MCP-first**: нативная интеграция в AI агентов (built for agents)
- **Design system встроен**: 8 visual styles, 50+ blocks, TTS, captions — всё из коробки
- **WCAG validator**: accessibility проверка в рендере — никто другой не имеет

### Против Remotion конкретно
- HF: plain HTML → любой LLM генерирует
- Remotion: React/TSX → нужен skill + знание JSX
- HF: Apache 2.0, solo dev может использовать коммерчески
- Remotion: $100/мес для 4+ (мы solo — бесплатно, но масштаб важен)
- HF: TTS + audio-reactive встроен
- Remotion: нужны ElevenLabs + Deepgram
- Обе: Puppeteer + FFmpeg под капотом

---

## 13. DOCKER COMPOSE — ПОЛНЫЙ PLATFORM STACK

```yaml
# docker-compose.platform.yml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgresql://hf:hf@postgres:5432/hyperframes
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: hyperframes-renders
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      JWT_SECRET: ${JWT_SECRET:-change-in-production}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET:-change-in-production}
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
      minio: { condition: service_started }
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: packages/worker/Dockerfile
    environment:
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql://hf:hf@postgres:5432/hyperframes
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: hyperframes-renders
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      BROWSER_POOL_SIZE: 4
      RENDER_CONCURRENCY: 4
      PRODUCER_ENABLE_BROWSER_POOL: "true"
      PRODUCER_MAX_WORKERS: "2"    # Per browser instance
    security_opt: [seccomp=unconfined]   # Chrome sandbox
    shm_size: 4gb                         # Chrome needs shared memory
    deploy:
      replicas: 2
      resources:
        limits: { memory: 8gb, cpus: '4' }
    depends_on: [redis, postgres, minio]
    restart: unless-stopped

  studio:
    build:
      context: .
      dockerfile: packages/studio/Dockerfile
    ports: ["3000:3000"]
    environment:
      VITE_API_URL: ${API_URL:-http://localhost:3001}
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hf
      POSTGRES_PASSWORD: hf
      POSTGRES_DB: hyperframes
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hf"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes: [redis_data:/data]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 14. DATABASE SCHEMA (Drizzle ORM)

```typescript
// packages/api/src/db/schema.ts
import { pgTable, text, timestamp, integer, jsonb, boolean, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  credits: integer('credits').notNull().default(0),
  plan: text('plan').notNull().default('free'),  // 'free' | 'starter' | 'pro' | 'enterprise'
  createdAt: timestamp('created_at').defaultNow(),
})

export const renderJobs = pgTable('render_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('queued'),  // queued|processing|complete|failed
  compositionHtml: text('composition_html'),
  compositionId: uuid('composition_id').references(() => compositions.id),
  variables: jsonb('variables'),
  outputFormat: text('output_format').notNull().default('mp4'),
  quality: text('quality').notNull().default('standard'),
  outputUrl: text('output_url'),
  errorMessage: text('error_message'),
  renderMinutes: integer('render_minutes'),  // для billing
  creditsCharged: integer('credits_charged'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

export const compositions = pgTable('compositions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  html: text('html').notNull(),
  variables: jsonb('variables'),  // CompositionVariable[] from @hyperframes/core
  thumbnail: text('thumbnail'),
  isTemplate: boolean('is_template').default(false),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),  // S3/MinIO URL
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  url: text('url').notNull(),
  events: jsonb('events'),  // ['job.complete', 'job.failed']
  secret: text('secret').notNull(),
  active: boolean('active').default(true),
})
```

---

## 15. SECURITY CHECKLIST

```
□ JWT secret >= 32 символов, из env var, никогда в коде
□ Rate limiting на /render: 10/мин per user
□ Rate limiting на /auth/login: 5/мин per IP
□ Max render minutes limit: проверять перед queue
□ Credits check: блокировать render если credits = 0
□ S3 presigned URLs: expire в 1 час для uploads
□ S3 signed URLs: expire в 24 часа для renders output
□ CORS: whitelist только studio origin
□ Helmet.js middleware: security headers
□ HTML sanitization: НЕЛЬЗЯ рендерить arbitrary HTML без lint
□ Webhook HMAC: подписывать все webhook payloads
□ Postgres prepared statements: Drizzle orm делает автоматически
□ No secrets in logs: маскировать JWT, S3 keys
□ Docker: не запускать Puppeteer как root
□ seccomp:unconfined ТОЛЬКО для Chrome (минимальные права)
```

---

## 16. PERFORMANCE TARGETS

```
Render cold start:  < 8 секунд (с browser pool: < 2 секунд)
30-second 1080p:    < 3 минут (draft), < 5 минут (standard)
API latency:        < 200ms (job submit), < 50ms (job status)
Studio load:        < 2 секунды first contentful paint
Browser pool:       4 warm instances, < 500ms acquisition
Parallel workers:   Auto-scale by CPU (parallelCoordinator logic)
```

---

## 17. ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ

### Полезные скрипты из репо
```bash
# Генерация превью для catalog blocks (для Studio каталога)
bun run generate:catalog-previews

# Синхронизация JSON schemas
bun run sync-schemas

# Проверка что все packages правильно паблишатся
bun run verify:packed-manifests

# Debug GSAP timeline
node skills/hyperframes/scripts/animation-map.mjs <dir> --out <dir>/.hyperframes/anim-map

# Бенчмарк рендера
npx hyperframes benchmark .
```

### Полезные env vars для разработки
```bash
# Ускорение итераций
PRODUCER_VERIFY_HYPERFRAME_RUNTIME=false  # Отключить SHA256 проверку
PRODUCER_FORCE_SCREENSHOT=false           # Использовать BeginFrame (быстрее)

# Отладка
PRODUCER_DEBUG=true                       # Verbose logging в engine

# Тест browser pool
PRODUCER_ENABLE_BROWSER_POOL=true
BROWSER_POOL_SIZE=2
```

---

## 18. ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ И WORKAROUNDS

### Puppeteer
- **Cold start 2-4 секунды**: решение → browser pool (PRODUCER_ENABLE_BROWSER_POOL=true)
- **Video-heavy compositions**: использовать `--workers 1` для стабильности
- **Memory leak**: перезапускать browser instance каждые N рендеров
- **seccomp**: Chrome требует `--security-opt seccomp=unconfined` в Docker

### GSAP
- **repeat: -1 сломает захват**: всегда конечные repeat: `Math.ceil(duration / cycle) - 1`
- **Async timeline construction**: НЕЛЬЗЯ строить timeline в async/setTimeout
- **`gsap.set()` на clip elements**: использовать `tl.set()` с timePosition

### Compositions
- **Font embedding**: producer embed fonts автоматически — не нужен Google Fonts CDN в рендере
- **`@chenglou/pretext`**: Pretext JS в @hf/core — используется для text layout
- **Sub-composition src**: пути через `../` от `compositions/`
- **Studio vs Standalone**: standalone НЕ использует `<template>` обёртку

### CLI
- **--workers auto**: на video-heavy compositions может нестабильно; fallback --workers 1
- **`hyperframes validate` WCAG**: требует Chrome; не работает в headless CI без Xvfb

---

## 19. ВОПРОСЫ ДЛЯ ИЗУЧЕНИЯ

Следующие области требуют глубокого изучения перед реализацией:

1. **`packages/core/src/studio-api/`** — что именно экспортируется? Это API для Studio ↔ CLI коммуникации.
2. **`@chenglou/pretext`** — как использует core? Это Pretext JS (JS text layout) — потенциально для будущего text renderer.
3. **`packages/producer/src/parity-harness.ts`** — механизм сравнения preview vs render. Изучить для integration tests.
4. **`packages/engine/src/services/videoFrameInjector.ts`** — инъекция видеофреймов. Нужно понять для HDR pipeline.
5. **PR #287 Composition authoring pipeline** — design.md picker + multi-scene subagents — изучить для AI generation pipeline.

---

## 20. ROADMAP TIMELINE

```
SPRINT 1 (неделя 1-2):
✅ packages/mcp/ — MCP server (render, lint, validate, add_block, list_blocks)
✅ CLI: --variables-file bulk render
✅ CLI: hyperframes mcp (запустить MCP server)
✅ Dockerfile для packages/api и packages/worker

SPRINT 2 (неделя 3-4):
✅ packages/api/ — Hono REST API (auth, jobs, compositions, assets)
✅ packages/worker/ — BullMQ worker + browser pool
✅ docker-compose.platform.yml полный stack
✅ Database schema (Drizzle + Postgres)

SPRINT 3 (неделя 5-6):
✅ Studio: Auth (Login/Register pages + JWT store)
✅ Studio: JobHistory panel
✅ Studio: AssetManager panel (S3-backed)
✅ Studio: CatalogBrowser panel

SPRINT 4 (неделя 7-8):
✅ WayinVideo integration (post-render clip-to-shorts)
✅ HeyGen Avatar skill update
✅ n8n trigger/action node
✅ Публичное демо + landing page

SPRINT 5+ (месяц 2):
□ Billing (Stripe credits)
□ Social distribution API
□ Analytics (OpenTelemetry)
□ White-label Studio
□ Templates marketplace
□ Remotion Lambda bridge (если нужен cloud scale)
```

---

*Файл создан: 18 апреля 2026*  
*Читать вместе с: CLAUDE.md · AGENTS.md · DESIGN.md · skills/hyperframes/SKILL.md*  
*Upstream OSS: github.com/heygen-com/hyperframes (Apache 2.0, v0.4.4)*  
*HyperFrames Platform форк: E:\GITHUB-local\hyperframes oss*
