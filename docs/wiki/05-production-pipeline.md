# 05. Производственный конвейер

## Эталонный pipeline

```text
Brief → Sources → Asset freeze → DESIGN → Script → Storyboard
→ VO/transcript → Composition → Static frames → Animation
→ Automated QA → Visual QA → Draft render → Approval
→ Deterministic final render → Publish → Metrics → Revision
```

## 1. Brief

Зафиксировать:

- аудиторию;
- одну основную мысль;
- CTA;
- площадки и aspect ratios;
- длительность;
- язык;
- обязательные/запрещенные claims;
- источник данных;
- право использования media;
- критерий успеха.

Одна версия ролика не должна одновременно быть explain, brand reel, tutorial и performance ad. Это разные narrative contracts.

## 2. Source collection

Источники могут быть:

- сайт;
- Figma;
- PR/issue/changelog;
- PDF/deck;
- CSV/API;
- transcript;
- screen recording;
- product catalog;
- brand book.

Каждый source получает provenance: URL/file, дата, автор, license/permission, checksum.

## 3. Asset freeze

Перед кодом:

- скачать remote images/video/audio;
- нормализовать filenames;
- проверить dimensions/duration/codecs;
- удалить дубли;
- создать thumbnails/proxies;
- записать checksum;
- сохранить original + derived versions;
- запретить silent replacement.

## 4. DESIGN.md

Это фактическая визуальная спецификация, не moodboard без чисел. Должна включать роли цветов, typography scale, spacing, shape language, background treatment, motion grammar и anti-patterns.

## 5. Script

Сначала смысл, затем motion. Для performance/social:

```text
Hook → Problem → Mechanism/proof → Payoff → CTA
```

Для tutorial:

```text
Outcome → Preconditions → Steps → Error prevention → Next action
```

Для product launch:

```text
Old friction → New behavior → 2–3 capabilities → Proof → Availability
```

## 6. Storyboard

На каждый beat:

- time range;
- narration/text;
- hero frame;
- foreground/midground/background;
- entrance order;
- one ambient motion;
- transition meaning;
- asset IDs;
- SFX/audio cue;
- risk/QA note.

## 7. Voice and timing

Scene duration выводить из реальной речи, а не из предположения. После TTS/recording:

- транскрибировать word-level;
- обновить storyboard timestamps;
- проверить паузы;
- скорректировать text density;
- не ускорять голос только ради старого тайминга.

## 8. Hero frames first

Для каждой сцены сделать статический snapshot без entrances. Проверить:

- hierarchy;
- safe areas;
- face/subject occlusion;
- line breaks;
- contrast;
- RTL/Cyrillic glyph coverage;
- overflow на длинных данных.

## 9. Motion pass

Добавлять движение по иерархии:

1. главный смысл;
2. подтверждающий объект;
3. secondary copy;
4. accent/background.

Не анимировать все одинаково. В одной сцене достаточно одного ambient behavior.

## 10. Automated QA

- schema validation;
- lint/typecheck;
- missing assets;
- duration bounds;
- overflow/contrast;
- caption overlap;
- audio clipping/loudness;
- representative frame rendering;
- deterministic rerender comparison.

## 11. Review

Делать два прохода:

### Content review

- claims;
- numbers;
- legal text;
- CTA;
- pronunciation;
- language.

### Visual/technical review

- rhythm;
- composition;
- transitions;
- dropped/frozen frames;
- codec/color/audio;
- platform crop.

## 12. Final render

Сохранять manifest:

```json
{
  "project": "launch-v3",
  "engine": "hyperframes",
  "engine_version": "pinned",
  "git_commit": "...",
  "input_sha256": "...",
  "assets_manifest": "assets.json",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "duration_frames": 450,
  "codec": "h264",
  "rendered_at": "ISO-8601",
  "qa": {"lint": "pass", "visual": "approved"}
}
```

## 13. Multi-format strategy

Не просто crop landscape → portrait. Проектировать layout zones:

- content safe frame;
- subject focal point;
- caption zone;
- CTA zone;
- platform UI occlusion zone.

Для каждого aspect ratio лучше отдельный composition preset, общий data model и общие components/tokens.

## 14. Batch strategy

Перед 1000 renders:

1. прогнать schema по всем rows;
2. найти экстремальные строки/числа;
3. выбрать 20 representative samples;
4. render draft;
5. провести visual regression;
6. только затем full batch;
7. использовать idempotency и manifest per row;
8. retry только failed jobs;
9. не перезаписывать успешный artifact без version bump.
