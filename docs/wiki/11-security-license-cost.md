# 11. Безопасность, лицензии и стоимость

## Threat model

Основные угрозы video generator:

- SSRF через remote media URL;
- XSS/script injection через HTML/data;
- path traversal;
- decompression bombs/oversized media;
- malicious codec/container;
- secret leakage in logs/screenshots;
- arbitrary code execution в user templates;
- cloud cost abuse;
- unauthorized voice/likeness;
- copyright violations;
- tenant data leakage;
- public bucket misconfiguration.

## Remote assets

Разрешать только:

- `https`;
- approved domains или controlled ingest proxy;
- limit redirects;
- DNS/IP re-check после redirect;
- deny loopback, link-local, private ranges, cloud metadata;
- content-length/type limit;
- timeout;
- malware/media probe;
- store copy in isolated object storage.

Не давать renderer прямой unrestricted internet в high-trust environment.

## User text/HTML

- text через `textContent`, не `innerHTML`;
- sanitize rich text;
- запрет script/iframe/event handlers;
- schema limits;
- CSS values allowlist;
- no arbitrary selectors targeting host;
- separate origins/sandbox for preview.

HyperFrames declarative variable bindings ограничивают опасные URL protocols, но свой script может снова открыть injection sink. Не полагаться только на runtime.

## User templates/code

Самый безопасный вариант — пользователь выбирает approved template и props. Если разрешен arbitrary code:

- isolated ephemeral VM/container;
- no host mounts;
- no cloud credentials;
- read-only base image;
- egress restrictions;
- CPU/RAM/disk/time quotas;
- seccomp/AppArmor/gVisor/Firecracker по уровню риска;
- destroy environment after job.

## Data privacy

- минимизировать retention;
- encrypt at rest/in transit;
- tenant-specific namespaces;
- signed URLs с коротким TTL;
- redact PII from logs;
- delete source/generated files by policy;
- consent/audit trail для personalized video;
- DPA/region requirements.

## HyperFrames license

Официальный репозиторий распространяется по Apache 2.0. Это не отменяет лицензии GSAP/plugins, шрифтов, stock media, TTS-моделей и third-party services.

## Remotion license

На 16 июля 2026 официальный pricing page сообщает:

- бесплатно для individuals и компаний до 3 человек;
- для компаний/коллабораций 4+ требуется Company License;
- Automators: $0.01/render, минимум $100/месяц;
- Creators: $25/месяц за seat;
- Enterprise: от $500/месяц.

Это динамические условия. Перед запуском проверить актуальную лицензию и определить, относится ли продукт к automation, creator или enterprise use.

## FFmpeg license

FFmpeg может собираться с LGPL или GPL-компонентами. Юридический эффект зависит от вашей сборки, linking и распространения. Не делать общее заключение без просмотра build configuration и способа доставки.

## Media/AI rights

Отдельно проверять:

- stock license на automated/broadcast/ads;
- music sync rights;
- font embedding/render rights;
- generated image/video provider terms;
- voice cloning consent;
- actor/model releases;
- trademark/product assets;
- geographic restrictions.

## Стоимость

Для решения build vs service считать:

```text
Engineering + design system + QA + render compute + storage/egress
+ AI/TTS APIs + license + support + moderation + failed renders
```

Массовое video generation редко ограничивается стоимостью CPU. Существенны template development, QA extreme inputs, rights management и operations.

## Budget guardrails

- max duration/resolution/fps per plan;
- per-tenant daily frames;
- concurrency quota;
- estimate before enqueue;
- cancel on budget threshold;
- caching/idempotency;
- lifecycle deletion;
- alert on abnormal retries;
- prevent unbounded URL downloads.
