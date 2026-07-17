# ReFrameMotion

**Локальная production-платформа для массовой программной генерации видео.**

ReFrameMotion связывает параметризованные шаблоны, очередь заданий, dashboard, HyperFrames, Remotion и MCP для Codex. Версия `1.0.0` полностью заменяет прежний концептуальный прототип и датирована **16 июля 2026 года**.

> Текущий production-профиль — один сервер или одна VM с постоянным диском. Горизонтальный Google Cloud-профиль с Cloud SQL и Cloud Run Jobs вынесен в roadmap, потому что SQLite нельзя безопасно разделять между несколькими Cloud Run-инстансами.

## Что работает

- REST API и встроенный dashboard без отдельной frontend-сборки;
- git-friendly каталог сайтов и видео-проектов в `projects/`;
- надежная SQLite-очередь в режиме WAL;
- массовые партии до 10 000 заданий через JSON или CSV;
- claim/retry/cancel/recovery для render jobs;
- безопасный реестр шаблонов: API не принимает произвольный HTML или shell-команды;
- HyperFrames renderer, Remotion renderer и mock renderer для тестов;
- MCP tools/resources/prompts для Codex и других MCP-клиентов;
- Docker Compose для одного production-узла;
- актуальная русская [Video Creation Wiki](docs/wiki/README.md);
- пять параметризованных рекламных шаблонов РОСПАН.

## Проверенные версии на 2026-07-16

- Node.js `>=22.16`;
- HyperFrames `0.7.60`;
- Remotion `4.0.490` для optional Remotion templates;
- FFmpeg 7.x рекомендуется, совместимость проверяется командой `npm run doctor`.

## Быстрый старт

```bash
git clone https://github.com/homgorn/reframemotion.git
cd reframemotion
cp .env.example .env
npm ci
npm run init

# HyperFrames нужен только для реальных HyperFrames-роликов
npm install --global hyperframes@0.7.60

npm run dev
```

Откройте `http://127.0.0.1:8787/`.

На Windows можно запустить dashboard двойным кликом:

```bat
start-dashboard.bat
```

Если API уже работает на `127.0.0.1:8787`, батник просто откроет dashboard. Если нет — проверит Node/npm, при первом запуске выполнит `npm ci` и стартует `node apps/api/server.mjs`.

Для первой проверки выберите шаблон `demo-card`. Он использует mock renderer и создает JSON-артефакт без Chromium.

## Массовый импорт

JSON:

```json
{
  "name": "July campaign",
  "jobs": [
    {
      "templateId": "rospan-fast-install",
      "variables": {
        "headline": "ОТДЕЛКА НЕ ДОЛЖНА ТОРМОЗИТЬ ОБЪЕКТ"
      }
    }
  ]
}
```

CSV:

```csv
template_id,engine,output_format,priority,max_attempts,variables_json
rospan-fast-install,hyperframes,mp4,10,2,"{""headline"":""Новый заголовок""}"
```

Импорт из CLI:

```bash
npm run import:batch -- examples/rospan-ads/batch.json "ROSPAN tests"
```

## Каталог сайтов и видео

Для тысяч сайтов и роликов используйте `projects/`. Это легкий реестр, который можно хранить в Git:

```text
projects/
  rospan.ru/
    site.json
    videos/
      rospan-site.json
      rospan-site-minute.json
      rospan-site-3min.json
      rospan-site-6min.json
```

Dashboard читает каталог через `GET /api/catalog` и показывает сайт, видео-проекты, статусы проверок, режим звука, preview URL и артефакты. Тяжелые MP4/WAV не коммитятся; они остаются в `data/outputs/`, release artifacts или внешнем object storage.

Каталог также поддерживает:

- `approvalStatus`: `draft`, `review`, `approved`, `final`, `rejected`;
- `sourceUrls`: ручной whitelist страниц для будущего capture;
- `brief`: структурированные пожелания к ролику;
- `aspectRatio` и `formats`: `landscape` 16:9, `portrait` 9:16 или `square` 1:1 для новых вариантов видео;
- `exportProfiles`: кнопки DEMO/FINAL/NO SOUND/SUBS ON и trusted запуск export job;
- проверку наличия локальных артефактов, если файлы доступны на машине.
- `contentReview`: автоматическая проверка клиентского текста, субтитров и voice script на мета-речь, упоминания движка/рендера/страниц сайта, слабый CTA и слишком быстрый темп голоса.

### Другие сайты и ручные ссылки

Система уже универсальна на уровне реестра, API, dashboard, очереди, render worker и export profiles. Для нового сайта не нужно пересобирать ReFrameMotion: добавляется новая папка `projects/<domain>/site.json`, манифесты видео в `projects/<domain>/videos/*.json` и рабочая папка видео/шаблона.

Что пока делается вручную или агентом: crawl сайта, выбор важных URL, генерация `DESIGN.md`/`SCRIPT.md`/`STORYBOARD.md`, сборка HyperFrames-композиции и QA. Для ручного списка ссылок практичный формат — хранить `sourceUrls` в манифесте проекта или отдельный `urls.txt` рядом с проектом, затем агент/скрипт использует его как whitelist для capture.

Для нативных пожеланий лучше завести поле `brief`/`prompt` в манифесте проекта и форму в dashboard. В v1 dashboard уже показывает export-профили, но еще не запускает полный website-to-video generator из свободного текста.

Текущий dashboard уже умеет сохранять draft brief из ручных URL, пожеланий и нужного формата кадра в `projects/_drafts/`. Следующий слой автоматизации — агент или worker, который берет этот draft, делает crawl, создает `DESIGN.md`/`SCRIPT.md`/`STORYBOARD.md`, собирает HyperFrames и добавляет полноценный project manifest. Вертикальные и квадратные версии лучше генерировать как отдельные композиции под выбранный aspect ratio, а не как автоматический crop финального 16:9.

Перед клиентским preview нужно прогонять:

```bash
npm run validate:content -- <project-id> --write
```

Для продающей презентации voiceover не должен рассказывать о том, как делался ролик, о HyperFrames, рендере, storyboard, страницах сайта, скриншотах, URL или capture. Эти детали остаются в QA и документации, а в видео остаются продукт, польза, доказательства и действие для клиента.

## API

```bash
curl http://127.0.0.1:8787/api/templates

curl -X POST http://127.0.0.1:8787/api/jobs \
  -H 'Content-Type: application/json' \
  -d '{"templateId":"demo-card","variables":{"headline":"Проверка"}}'
```

В production задайте `REFRAMOTION_API_KEY` длиной не менее 24 символов и отправляйте `Authorization: Bearer ...`.

Полная спецификация: [docs/api/http-api.md](docs/api/http-api.md).

## Codex и MCP

В корне находится [AGENTS.md](AGENTS.md) — это основной контекст для Codex. MCP-сервер запускается так:

```bash
REFRAMOTION_API_URL=http://127.0.0.1:8787 npm run mcp
```

Пример конфигурации клиента:

```toml
[mcp_servers.reframotion]
command = "node"
args = ["apps/mcp/server.mjs"]
cwd = "/absolute/path/to/reframemotion"
```

MCP намеренно не принимает произвольный HTML. Агент сначала выбирает зарегистрированный template ID, затем передает только валидируемые variables.

## Архитектура

```text
Dashboard / Codex / CLI
          │
          ▼
       HTTP API ───── MCP server
          │
          ▼
     SQLite job store
          │ claim/retry/cancel
          ▼
     Render worker
       ├─ HyperFrames CLI
       ├─ Remotion CLI
       └─ Mock renderer
          │
          ▼
      data/outputs
```

Подробнее: [docs/architecture/overview.md](docs/architecture/overview.md).

## Production

```bash
export REFRAMOTION_API_KEY='replace-with-a-long-random-secret'
docker compose up --build -d
```

Перед запуском прочитайте [production runbook](docs/operations/runbook.md) и [security policy](SECURITY.md).

## Что не следует считать готовым

- горизонтальное масштабирование на нескольких машинах;
- multi-tenant auth, биллинг и квоты;
- Cloud SQL/PostgreSQL job store;
- автоматическая загрузка результатов в Google Cloud Storage;
- визуальный template editor;
- юридическая проверка рекламных утверждений.

Эти задачи перечислены в [ROADMAP.md](ROADMAP.md). Текущая версия рассчитана на реальную работу на одном устойчивом узле, а не на фиктивный SaaS API.

## Репозиторий и артефакты

MP4 и WAV не коммитятся в Git. Исходники шаблонов хранятся в `templates/`, сайт/видео-реестр — в `projects/`, batch-файлы и facts — в `examples/`; результаты рендера создаются в `data/outputs/` или публикуются как release artifacts.

## Лицензии

Код ReFrameMotion — Apache-2.0. HyperFrames также публикуется под Apache-2.0. У Remotion отдельная лицензия; перед коммерческим использованием проверяйте актуальные условия для размера организации и сценария использования.
