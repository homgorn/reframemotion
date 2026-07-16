# 10. QA, тестирование и отладка

## Четыре уровня качества

1. **Structural:** проект собирается, schema валидна, assets доступны.
2. **Frame:** каждый representative frame корректен.
3. **Temporal:** движение, transitions, captions и audio sync корректны.
4. **Delivery:** codec, color, loudness, metadata, размер и platform compatibility.

## HyperFrames checks

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes inspect --samples 15
npx hyperframes compositions
npx hyperframes render --quality draft --output renders/qa.mp4
```

Для сложной хореографии использовать animation map. Каждое warning либо исправляется, либо документируется как intentional.

## Remotion checks

```bash
npm run typecheck
npm test
npx remotion still Main --frame=0 --scale=0.25
npx remotion still Main --frame=90 --scale=0.25
npx remotion render Main out/qa.mp4
```

Добавить unit tests для pure functions, schema, layout decisions и metadata. React snapshot сам по себе не проверяет rendered pixels.

## Representative frames

Минимум:

- первый кадр;
- окончание entrance;
- hero frame каждой сцены;
- середина каждого transition;
- последний кадр;
- caption extremes;
- самый длинный input;
- самый большой/маленький number;
- missing optional asset;
- locale variants.

## Visual regression

Хранить golden images для стабильных templates. Сравнение:

- exact pixel — только в полностью pinned Docker;
- perceptual diff — лучше для допустимых minor differences;
- threshold + masks для intentional dynamic zones.

Не обновлять goldens автоматически после fail.

## Determinism test

Одинаковый input рендерится дважды в одном image. Сравнить:

- frame hashes/perceptual hashes;
- duration/frame count;
- audio length;
- artifact metadata.

Если результат плавает, искать:

- random/time;
- network asset;
- font fallback;
- nondeterministic layout measurement;
- asynchronous data race;
- animation tied to realtime;
- codec nondeterminism.

## Overflow tests

Генерировать adversarial inputs:

```text
Очень длинный заголовок
ОДНОСЛОВОБЕЗПРОБЕЛОВ
999999999999.99
-42%
emoji + кириллица + латиница
RTL строка
пустая строка
null optional image
```

Fallback hierarchy:

1. wrap;
2. reduce font within min;
3. reduce secondary copy;
4. alternate layout;
5. truncate only when product permits;
6. reject row with clear error.

## Temporal QA

- первый motion не начинается до загрузки scene;
- нет flash fully-formed content;
- переход использует непустой outgoing frame;
- нет двух caption groups;
- audio не дублируется;
- media seek корректен;
- final hold/fade имеет смысл;
- no dead zone без intentional breathe.

## Color/codec QA

- Rec.709 vs HDR specified;
- no unexpected gamma shift;
- gradients не banding-critical;
- alpha correct;
- H.264 profile compatible;
- frame rate rational when required;
- source screen recordings may need PNG frame extraction for text clarity;
- platform re-encode tested.

## Failure taxonomy

```text
INPUT_INVALID
ASSET_MISSING
ASSET_UNAUTHORIZED
MEDIA_UNSUPPORTED
FONT_MISSING
LAYOUT_OVERFLOW
COMPOSITION_ERROR
BROWSER_CRASH
RENDER_TIMEOUT
ENCODE_FAILED
UPLOAD_FAILED
QA_FAILED
CANCELLED
```

Ошибки должны быть машинно читаемыми, а не только одним stderr blob.

## Definition of Done

- brief/design/script/storyboard versioned;
- no unresolved lint/type errors;
- representative frames approved;
- audio/captions verified;
- deterministic environment pinned;
- final manifest created;
- source/licenses recorded;
- artifact playable on target platforms;
- retry/publish path tested.
