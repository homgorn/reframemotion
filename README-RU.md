# ReFrameMotion

**HTML to Video API для AI-агентов.** Пиши HTML — получай MP4.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-yellowgreen.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![npm version](https://img.shields.io/npm/v/hyperframes.svg)](https://www.npmjs.com/package/hyperframes)

---

## Что это?

**ReFrameMotion** — open-source платформа для программного рендеринга видео из HTML.

Пишешь HTML-композиции с GSAP-анимациями → отправляешь в API → получаешь MP4/WebM.

```
HTML → ReFrameMotion → MP4
```

## Зачем?

- **API-first** — REST API для рендеринга видео
- **MCP-native** — нативная поддержка AI-агентов (Claude, Cursor, Windsurf, Copilot)
- **Deterministic** — один и тот же HTML = один и тот же MP4 (бинарен идентичен)
- **Self-hostable** — запусти у себя (Docker, любой сервер)
- **Apache 2.0** — бесплатный для любого использования

## Кому?

- **Разработчики** — автоматизация видео-контента
- **AI-агенты** — генерация видео через MCP
- **SaaS-платформы** — встроенный рендеринг
- **Контент-студии** — массовое производство видео

## Быстрый старт

```bash
# Установка
npm install -g hyperframes

# Создание проекта
hyperframes init my-video

# Рендеринг
hyperframes render --output video.mp4
```

## REST API

```bash
curl -X POST https://api.reframemotion.com/render \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "compositionHtml": "<div class=\"clip\" data-start=\"0\">Привет</div>",
    "variables": {"name": "Мир"},
    "quality": "high"
  }'
```

## MCP Server

```bash
# Claude Desktop
hyperframes mcp | claude

# Cursor
hyperframes mcp | cursor
```

## Развёртывание

```bash
# Docker Compose
docker-compose up -d

# Отдельные компоненты
docker-compose -f docker-compose.platform.yml up -d
```

## Сравнение с аналогами

| | ReFrameMotion | HeyGen | Remotion |
|--|--------------|--------|----------|
| **Цена** | Бесплатно | $25/мес | $100/мес |
| **Лицензия** | Apache 2.0 | Проприетарная | Платная для 4+ |
| **HTML-рендер** | ✅ Нативный | ❌ | ❌ |
| **Self-host** | ✅ | ❌ | ✅ |
| **MCP** | ✅ | ✅ Remote | ✅ |

## Архитектура

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  AI     │────▶│   API   │────▶│ Worker  │
│ Agent   │     │  (Hono) │     │ (Bull)  │
└─────────┘     └─────────┘     └─────────┘
                                     │
                    ┌─────────────────┴──────────────┐
                    ▼                                ▼
              ┌─────────────┐                ┌─────────────┐
              │  Redis     │                │ Puppeteer  │
              │  (Queue)  │                │  (Render)  │
              └─────────────┘                └─────────────┘
```

## Contributing

См. [CONTRIBUTING.md](CONTRIBUTING.md)

## Лицензия

Apache License 2.0 — свободное использование для любых целей.

---

**ReFrameMotion** — часть экосистемы HyperFrames Platform.