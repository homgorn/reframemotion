# ReFrameMotion — HTML в Видео API для AI-агентов

**API для рендеринга видео из HTML.** Программная генерация видео через REST API или MCP. Open-source, self-hosted, Apache 2.0.

## Описание

**ReFrameMotion** — это open-source платформа для автоматического создания видео из HTML-разметки. Загрузи HTML с GSAP-анимациями → получи MP4 или WebM через REST API.

## Для чего нужен ReFrameMotion?

1. **Автоматизация видео-контента** — генерируй видео программно
2. **AI-агенты** — Claude, Cursor, Windsurf создают видео через MCP
3. **SaaS-продукты** — добавь рендеринг видео в свой сервис
4. **Массовое производство** — шаблонизация + bulk rendering

## Как работает?

```
HTML-композиция (GSAP)
        │
        ▼
┌───────────────┐
│   ReFrameMotion  │
│   Render API    │
└───────────────┘
        │
        ▼
    MP4 / WebM
```

## Быстрый старт

```bash
npm install -g hyperframes
hyperframes init my-video
hyperframes render --output video.mp4
```

## REST API

```bash
curl -X POST https://api.reframemotion.com/render \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"compositionHtml": "<div>Hello</div>"}'
```

## MCP для AI-агентов

```bash
# Claude Code
hyperframes mcp | claude

# Cursor
hyperframes mcp | cursor
```

## Ключевые возможности

| Функция | Описание |
|---------|----------|
| **HTML to Video** | Рендеринг из HTML + CSS + GSAP |
| **REST API** | Программный доступ |
| **MCP Native** | AI-агенты (Claude, Cursor, Windsurf) |
| **Deterministic** | Повторяемый результат |
| **Self-hosted** | Запуск на своём сервере |
| **Docker** | Контейнеризация |

## Сравнение

| | ReFrameMotion | HeyGen | Remotion |
|--|--------------|--------|----------|
| **Лицензия** | Apache 2.0 | Проприетарная | Платная ($100/мес) |
| **Self-hosted** | ✅ | ❌ | ✅ |
| **HTML API** | ✅ | ❌ | ❌ |
| **MCP Server** | ✅ | ✅ Remote | ✅ |
| **Цена** | Бесплатно | $25+/мес | $100+/мес |

## Развёртывание

```bash
docker-compose up -d
```

## Использование

1. **Установка:** `npm install -g hyperframes`
2. **Проект:** `hyperframes init video-project`
3. **Рендеринг:** `hyperframes render --output.mp4`
4. **API:** POST /render с HTML

## Технические детали

- **Язык:** TypeScript, Node.js 22+
- **Рендеринг:** Puppeteer + Chrome + FFmpeg
- **API:** Hono (REST), MCP SDK
- **Очередь:** BullMQ + Redis
- **Анимации:** GSAP, Lottie, CSS
- **Форматы:** MP4 (H.264), WebM (VP9)

## Лицензия

Apache License 2.0 — свободное использование.

## Документация

- [README.md](README.md) — English version
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [docs/](docs/) — Full documentation