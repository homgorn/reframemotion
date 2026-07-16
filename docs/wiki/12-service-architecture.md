# 12. Архитектура собственного сервиса генерации видео

## Целевая архитектура

```text
Web/CMS/CRM/MCP
      │
API Gateway + Auth + Rate Limits
      │
Project/Template Service ─── Postgres
      │                       │
Asset Ingest ── Object Storage/CDN
      │
Validation + Planning
      │
Queue (Redis/SQS/Rabbit/Kafka)
      │
Render Workers (HyperFrames or Remotion)
      │
QA Workers → Artifact Storage → Webhook/Download
      │
Metrics/Logs/Tracing/Cost Ledger
```

## Source of truth

Postgres:

- users/tenants;
- templates and versions;
- projects;
- render jobs;
- input schemas;
- approvals;
- artifact metadata;
- cost records.

Object storage:

- original assets;
- normalized derivatives;
- bundles;
- snapshots;
- rendered artifacts;
- manifests/log archives.

Git:

- template source;
- skills/prompts;
- schemas;
- DESIGN systems;
- fixtures/evals;
- migrations.

## Template contract

```json
{
  "template_id": "product-launch",
  "version": "3.2.0",
  "engine": "remotion",
  "engine_version": "pinned",
  "composition_id": "Portrait",
  "schema_version": 4,
  "supported_formats": ["1080x1920@30", "1920x1080@30"],
  "max_duration_seconds": 30,
  "required_assets": ["logo", "hero"],
  "qa_profile": "social-v2"
}
```

## Control plane и data plane

### Control plane

- auth;
- templates;
- validation;
- scheduling;
- billing;
- status;
- audit.

### Data/render plane

- asset download/probe;
- browser render;
- FFmpeg;
- upload;
- no long-lived privileged credentials.

Разделение уменьшает blast radius renderer compromise.

## API

```text
POST /projects
POST /projects/{id}/assets
POST /renders
GET  /renders/{id}
POST /renders/{id}/cancel
GET  /renders/{id}/artifacts
POST /webhooks/render-complete
```

`POST /renders` принимает только validated template ID/version и input JSON, а не shell command/path.

## Preview architecture

### Remotion

Player в frontend с тем же props/schema. Server render использует тот же component bundle.

### HyperFrames

Studio/player/preview server или экспортированный preview endpoint. Для multi-tenant нельзя давать один общий mutable workspace.

## Approval workflow

```text
draft → auto-QA → internal review → client review → approved → final render → published
```

Каждое approval привязано к exact input hash и template version. После изменения approval сбрасывается.

## Multi-tenant isolation

- tenant ID во всех rows/objects;
- bucket prefix policy;
- worker job token scoped to one job;
- no shared temp filenames;
- cleanup in finally;
- logs access controlled;
- prevent cross-tenant cache key collision.

## Schema evolution

Template v4 не должен молча принимать v2 input. Использовать migrations:

```text
input v2 → migrate → v3 → migrate → v4 → validate
```

Сохранять original и normalized input.

## Eval suite для агентной генерации

Набор задач:

- 15s product launch;
- 30s tutorial;
- 10-row personalization;
- long Cyrillic title;
- missing image;
- RTL caption;
- chart with negative values;
- shader transition;
- transparent overlay;
- website capture.

Оценки:

- build success;
- lint/type errors;
- visual overflow;
- deterministic repeat;
- brand adherence;
- factual accuracy;
- render time/cost.

## MVP roadmap

### Этап 1

- один движок;
- 3 templates;
- local Docker workers;
- object storage;
- simple queue;
- manual approval.

### Этап 2

- Player/Studio preview;
- schema editor;
- batch CSV;
- webhooks;
- visual regression;
- billing/cost ledger.

### Этап 3

- MCP server;
- agent storyboard/implementation;
- template marketplace;
- distributed rendering;
- localized variants;
- analytics feedback loop.

Не начинать с универсального Canva-клона. Сначала автоматизировать 1–2 repeatable jobs с четкими входами.
