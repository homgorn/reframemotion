# 04. MCP, плагины и Agent Skills

## Не путать три понятия

### Agent Skill

Набор инструкций и знаний для coding agent. Skill объясняет, как правильно писать код, какие проверки запускать и какие anti-patterns запрещены. Сам по себе skill не дает сетевого доступа или права запускать внешнюю систему.

### MCP

Model Context Protocol — стандартный runtime-протокол между AI host/client и MCP server. Сервер может предоставлять:

- **tools** — действия;
- **resources** — данные/файлы/логи;
- **prompts** — шаблоны взаимодействия;
- notifications/progress для долгих операций.

Транспорт: локальный stdio или удаленный Streamable HTTP. Базовый data layer — JSON-RPC 2.0.

### Plugin/Connector

Продуктовая упаковка интеграции в конкретном клиенте. Она может использовать MCP, собственный API или оба подхода.

## Что уже дают подключенные навыки

HyperFrames skill фиксирует hard rules по HTML/GSAP, captions, transitions, CLI, registry и website-to-video. Remotion skill покрывает composition, media, sequencing, captions, effects, render и current package names.

Это снижает вероятность типичных ошибок агента, но не заменяет:

- чтение текущей документации;
- запуск linter/tests;
- визуальный inspection;
- version pinning;
- проверку лицензии.

## Рекомендуемый собственный Video MCP Server

### Tools

```text
video.project.create
video.project.inspect
video.capture.website
video.asset.import
video.asset.freeze
video.transcribe
video.tts
video.storyboard.generate
video.render.preview
video.render.start
video.render.status
video.render.cancel
video.qa.run
video.artifact.publish
```

### Resources

```text
video://projects/{id}/brief
video://projects/{id}/design
video://projects/{id}/storyboard
video://projects/{id}/manifest
video://jobs/{id}/logs
video://jobs/{id}/artifacts
video://catalog/styles
video://catalog/templates
```

### Prompts

```text
/product-launch
/website-tour
/pr-to-video
/faceless-explainer
/shorts-recut
/data-story
/captioned-social
/personalized-batch
```

## Tool design

Каждый tool должен иметь строгую JSON Schema. Плохой tool:

```json
{"command": "любая shell-команда"}
```

Хороший tool:

```json
{
  "project_id": "uuid",
  "composition_id": "Main",
  "preset": "draft|standard|high",
  "format": "mp4|mov|webm",
  "input": {"schema_version": 2, "title": "..."},
  "idempotency_key": "..."
}
```

## Долгий render и MCP

Render — долгий job. Не держать один RPC безгранично. Надежный паттерн:

1. `render.start` валидирует запрос и возвращает `job_id`.
2. Worker выполняет job в очереди.
3. `render.status` возвращает stage/progress/errors.
4. progress notifications/SSE используются как дополнение.
5. `render.cancel` ставит cancellation flag.
6. `artifact.publish` выдает ограниченную signed URL.

MCP Tasks существуют как развивающаяся возможность протокола, но архитектуру лучше не привязывать к экспериментальной функции без fallback.

## Безопасность MCP

- отдельный workspace root на project;
- запрет path traversal и symlink escape;
- URL allowlist/deny private networks;
- no arbitrary shell;
- лимиты размера, fps, duration, resolution, frame count;
- quotas per user/tenant;
- OAuth/short-lived tokens для remote HTTP;
- секреты не передавать в props или logs;
- audit log tool calls;
- human approval перед внешней публикацией;
- renderer работает без доступа к control-plane credentials.

## Агентный workflow

Рекомендуется разделить роли:

1. **Researcher** — собирает source facts/assets.
2. **Script editor** — делает message hierarchy и текст.
3. **Art director** — выпускает DESIGN.md/storyboard.
4. **Implementer** — пишет composition.
5. **QA agent** — читает код, linter output, snapshots.
6. **Render operator** — запускает jobs и проверяет manifest.

Не давать одному агенту самому придумать требования, написать код и объявить результат успешным без независимой проверки.

## Полезные MCP-интеграции

- GitHub: PR/issue/release → видео;
- Figma: design tokens/frames → storyboard/assets;
- CMS/WordPress: статьи/товары → clips;
- Analytics/SEO: CSV/metrics → data stories;
- CRM: персональные поля → batch;
- DAM/S3: approved assets;
- TTS/transcription;
- image/video generation providers;
- queue/observability systems.

## Версионирование prompts и skills

Хранить в Git:

```text
skills/
prompts/
schemas/
styles/
templates/
evals/
```

У каждого skill/prompt:

- semantic version;
- changelog;
- supported engine versions;
- positive/negative eval cases;
- prohibited patterns;
- required validation commands.
