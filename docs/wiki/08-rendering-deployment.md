# 08. Рендер, масштабирование и деплой

## Общая модель

Browser renderer обычно делает:

1. загрузка bundle/HTML;
2. probe compositions/media;
3. seek на frame/time;
4. screenshot/frame capture;
5. параллельная обработка кадров/chunks;
6. FFmpeg encode/stitch;
7. upload artifact;
8. manifest/status.

Узкие места:

- декодирование source video;
- Chrome painting/compositing;
- WebGL/shaders;
- network asset fetch;
- PNG/JPEG frame I/O;
- FFmpeg encode;
- cold start;
- RAM/ephemeral disk.

## Local vs reproducible

Local render быстрее для разработки, но output может отличаться из-за Chrome/fonts/OS. Для финала:

- Docker/image digest;
- pinned browser;
- bundled fonts;
- frozen assets;
- pinned FFmpeg;
- fixed locale/timezone;
- no external data mutation.

HyperFrames прямо рекомендует Docker для CI/agent production. Remotion также следует запускать в контролируемом server environment.

## HyperFrames render modes

Поддерживаются локальные форматы MP4, MOV, WebM, GIF и PNG sequence. Для alpha предпочтителен ProRes 4444/MOV либо подходящий WebM.

```bash
npx hyperframes render --quality draft --output draft.mp4
npx hyperframes render --docker --quality high --output final.mp4
npx hyperframes render --format mov --output overlay.mov
```

Batch имеет отдельную concurrency. Не увеличивать одновременно frame workers и batch concurrency без memory benchmark.

## Remotion render modes

### CLI/local

Хорош для разработки и небольших batch.

### Own SSR

`@remotion/renderer` в worker containers. Подходит, когда:

- нужен любой cloud/VPS/Kubernetes;
- видео длинные;
- нужна собственная очередь;
- требования не подходят Lambda.

### Lambda

Сильна для burst parallelism. Требует AWS, S3, IAM, квот, cleanup и cost controls.

### Cloud Run

Официальная реализация Alpha/not actively developed на дату исследования. Не считать ее default production route.

## Очередь

Минимальная модель job:

```text
queued → validating → preparing → rendering → encoding
→ uploading → qa → completed
                 ↘ failed / cancelled
```

Поля:

```json
{
  "job_id": "uuid",
  "tenant_id": "uuid",
  "template_version": "v3.2.1",
  "input_hash": "sha256",
  "priority": 5,
  "attempt": 1,
  "max_attempts": 3,
  "progress": 0.42,
  "stage": "rendering",
  "artifact_uri": null,
  "error_code": null
}
```

## Idempotency

Ключ результата:

```text
hash(template commit + engine version + normalized input + asset hashes + render preset)
```

Если artifact с таким ключом уже прошел QA, повторный запрос возвращает его, а не рендерит заново.

## Retry policy

Retry только transient errors:

- network timeout;
- worker preemption;
- temporary storage failure;
- rate limit.

Не retry автоматически:

- schema invalid;
- missing glyph;
- code exception;
- license/permission denial;
- asset unsupported;
- deterministic overflow.

## Concurrency

Выбирать по измерениям:

```text
concurrency <= min(CPU bound, RAM bound, disk bound, provider quota, budget)
```

Один Chrome worker может потреблять значительную RAM. 60 fps удваивает число кадров по сравнению с 30 fps; 4K увеличивает pixel work примерно в 4 раза против 1080p.

## Cost model

```text
Total cost = compute + storage + egress + TTS/AI + license + retries + observability
```

Считать стоимость не «за минуту исходника», а по:

- frame count;
- resolution;
- scene complexity;
- codec/preset;
- source decoding;
- worker concurrency;
- cache hit rate.

## Performance optimizations

- proxy media для preview;
- precompute transcripts/audio features;
- reuse bundle;
- cache fonts/assets;
- уменьшить oversized images;
- избегать тяжелого backdrop-filter;
- анимировать transforms;
- не рендерить 60 fps без продуктовой причины;
- segment/chunk render длинных видео;
- hardware encode применять после проверки качества/совместимости;
- representative benchmark на реальном template mix.

## Observability

Метрики:

- queue wait;
- prepare time;
- frame capture fps;
- encode time;
- total duration;
- memory peak;
- retries;
- failures by code;
- cost/job;
- cache hit rate;
- artifact size;
- QA failure rate.

Логи должны содержать IDs и версии, но не секреты/персональные данные.
