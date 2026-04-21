# ReFrameMotion

**HTML to Video API для AI-агентов.** Пиши HTML — получай MP4.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-yellowgreen.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![npm version](https://img.shields.io/npm/v/hyperframes.svg)](https://www.npmjs.com/package/hyperframes)
[![Discord](https://img.shields.io/badge/Discord-Join-blue.svg)](https://discord.gg/hyperframes)

---

## Что это?

**ReFrameMotion** — open-source платформа для программного рендеринга видео. Пишешь HTML-композиции с GSAP-анимациями, отправляешь в API — получаешь MP4/WebM.

```
HTML → ReFrameMotion → MP4
```

## Зачем?

- **API-first** — REST API для рендеринга
- **MCP-native** — нативная поддержка AI-агентов (Claude, Cursor, Windsurf)
- **Deterministic** — один и тот же HTML = один и тот же MP4
- **Self-hostable** — запусти у себя (Docker)
- **Apache 2.0** — бесплатный для любого использования

## Быстрый старт

```bash
# Установка
npm install -g hyperframes

# Создание проекта
hyperframes init my-video

# Рендеринг
hyperframes render --output video.mp4
```

## API

```bash
curl -X POST https://api.reframemotion.com/render \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "compositionHtml": "<div class=\"clip\" data-start=\"0\">Hello World</div>",
    "variables": {"name": "World"}
  }'
```

## AI-агенты

```bash
# Claude Code
npx @anthropic-ai/claude-code@latest

# MCP server
hyperframes mcp | claude
```

## Сравнение

| | ReFrameMotion | HeyGen | Remotion |
|--|--------------|--------|----------|
| **Цена** | Бесплатно | $25/мес | $100/мес |
| **Лицензия** | Apache 2.0 | Проприетарная | Платная |
| **API** | REST | REST | Lambda |
| **HTML-рендер** | ✅ Нативный | ❌ | ❌ |
| **MCP** | ✅ Встроен | ✅ Remote | ✅ |
| **Self-host** | ✅ | ❌ | ✅ |

## Развёртывание

```bash
docker-compose up -d
```

## Contributing

См. [CONTRIBUTING.md](CONTRIBUTING.md)

## Лицензия

Apache License 2.0 — свободное использование.

---

**ReFrameMotion** — часть экосистемы HyperFrames.