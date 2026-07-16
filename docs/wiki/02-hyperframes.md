# 02. HyperFrames

## Архитектурная модель

HyperFrames рассматривает HTML как source of truth. Композиция содержит:

- DOM и CSS для конечного визуального состояния;
- `data-*` атрибуты для клипов, времени, треков и размеров;
- paused GSAP timeline для анимации;
- media-элементы, которыми управляет сам runtime;
- покадровый seek и захват Chrome;
- FFmpeg для кодирования результата.

Это не запись realtime-анимации. Рендерер устанавливает точное время/кадр, поэтому код должен быть seekable и детерминированным.

## Минимальный контракт композиции

```html
<div
  data-composition-id="main"
  data-width="1920"
  data-height="1080"
  data-duration="8"
>
  <div class="scene-content">
    <h1 id="title">Заголовок</h1>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({paused: true});
    tl.from('#title', {opacity: 0, y: 60, duration: 0.7, ease: 'expo.out'}, 0.2);
    window.__timelines.main = tl;
  </script>
</div>
```

Для root-файла не используйте `<template>`. `<template>` нужен внешним sub-composition-файлам.

## Data-атрибуты

Базовые:

- `id` — уникальный идентификатор клипа;
- `data-start` — начало в секундах или ссылка на другой клип;
- `data-duration` — длительность;
- `data-track-index` — временной трек, но не визуальный z-index;
- `data-media-start` — trim offset;
- `data-volume` — 0–1;
- `data-composition-id`, `data-width`, `data-height` — контракт композиции.

В актуальных примерах timed DOM/media-элементы могут также маркироваться `class="clip"`. При работе с конкретной версией следуйте ее scaffold и запускайте linter.

## Визуальная система до кода

Перед HTML должен существовать `DESIGN.md` или эквивалент. Минимум:

- палитра с ролями;
- шрифты и веса;
- правила композиции;
- характер движения;
- запрещенные паттерны.

Это предотвращает типичную проблему агентной генерации: каждый новый scene-файл получает случайный синий, Roboto/Inter и несогласованный easing.

## Layout before animation

Сначала собрать hero frame каждой сцены — момент максимальной видимости контента. Только потом добавлять `gsap.from()`.

Правильно:

```css
.scene-content {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 110px 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
}
```

Не использовать абсолютное позиционирование главного контентного контейнера с жесткими размерами canvas. Absolute positioning оставлять декору, overlays и намеренным зонам.

## GSAP-контракт

- timeline всегда `paused: true`;
- timeline регистрируется в `window.__timelines`;
- timeline создается синхронно;
- не использовать `setTimeout`, Promise и async-конструирование;
- не использовать `Math.random()` и `Date.now()`;
- не использовать `repeat: -1`; вычислять конечное число повторов;
- анимировать transform/opacity/color, а не layout-свойства;
- не анимировать размеры самого `<video>` — анимировать wrapper;
- не вызывать `play()`, `pause()`, `currentTime`: runtime владеет media playback.

### Важная оговорка про `autoAlpha`

Обычная рекомендация GSAP — `autoAlpha`, но она меняет `visibility`. В HyperFrames безопаснее использовать `opacity` и явный timeline lifecycle, особенно для captions и клипов. Framework-specific правила выше общей GSAP-рекомендации.

## Видео и аудио

Видео должно быть muted/playsinline; звук — отдельным `<audio>`:

```html
<video id="v" class="clip" data-start="0" data-track-index="0"
       src="assets/source.mp4" muted playsinline></video>
<audio id="a" class="clip" data-start="0" data-track-index="2"
       src="assets/source.mp4" data-volume="1"></audio>
```

Причина: runtime независимо синхронизирует визуальный поток и аудио.

## Переходы

Встроенный skill задает жесткую дисциплину для multi-scene:

- каждая сцена получает entrance-анимации;
- между сценами есть переход;
- до перехода не делать отдельный exit контента;
- последняя сцена может завершаться fade-out;
- выбрать один основной тип перехода и 1–2 акцента, а не новый эффект каждый раз.

Для shader transitions не смешивать CSS и shader-переходы в одной композиции. Учитывать ограничения html2canvas: явные background colors, осторожность с CSS variables/transparent gradients и тонкими градиентными линиями.

## Переменные и массовый рендер

Декларация:

```html
<html data-composition-variables='[
  {"id":"name","type":"string","default":"Клиент"},
  {"id":"accent","type":"color","default":"#ff5a36"}
]'>
```

Чтение:

```js
const {name = 'Клиент', accent = '#ff5a36'} = __hyperframes.getVariables();
```

Декларативные bindings:

```html
<h1 data-var-text="name">Клиент</h1>
<img data-var-src="heroImage" src="assets/fallback.jpg" />
```

Batch:

```bash
npx hyperframes render \
  --batch rows.json \
  --output 'renders/{name}.mp4' \
  --strict-variables
```

Root `data-duration`, width, height и fps нельзя надежно менять runtime-переменной: они определяют compile/render contract. Clip duration может быть прочитан из live DOM, root duration — нет.

## Duration: версионно-чувствительное место

В актуальных материалах встречаются два режима/описания:

1. Явный root `data-duration` фиксирует общую длину на compile stage.
2. Если длина выводится из GSAP timeline, короткий timeline может обрезать длинное видео, и его приходится расширять marker/set.

Безопасная практика:

- всегда задавать явную root duration для production-шаблона;
- не пытаться менять ее через переменную;
- проверять `npx hyperframes compositions`;
- фиксировать version и не переносить старые snippets без проверки.

## CLI-конвейер

```bash
npx hyperframes init my-video
cd my-video
npx hyperframes doctor
npx hyperframes lint
npx hyperframes check
npx hyperframes inspect --samples 15
npx hyperframes preview
npx hyperframes render --quality draft --output renders/draft.mp4
npx hyperframes render --docker --quality high --output renders/final.mp4
```

## Registry

- block — самостоятельная sub-composition;
- component — snippet, который встраивается в host composition.

```bash
hyperframes add data-chart
hyperframes add grain-overlay
```

После установки проверять IDs, timing attrs, пути и timeline integration. Registry-элемент — стартовая заготовка, а не гарантия готового дизайна.

## Типовые ошибки

1. Анимация width/height/top/left на `<video>`.
2. Ручной play/pause/seek media.
3. Не зарегистрирован timeline.
4. Root обернут в `<template>`.
5. Бесконечный repeat.
6. Асинхронное построение timeline.
7. Два timelines одновременно анимируют одно свойство.
8. Случайность без seeded PRNG.
9. Контент построен в стартовом, а не финальном состоянии.
10. Root duration короче фактического сюжета.
11. Удаленные ассеты изменились между preview и render.
12. Shader transition захватывает CSS, несовместимый с canvas.

## Сильные стороны

- прямой контроль DOM/CSS;
- удобная генерация агентом;
- capture website → design tokens → storyboard;
- variables/batch;
- inspect/contrast/animation-map;
- Docker reproducibility;
- открытая лицензия.

## Риски

- новая и быстро меняющаяся экосистема;
- возможность расхождения skill и свежих docs;
- HTML/GSAP без строгих типов легче породит runtime-ошибку;
- тяжелые filters/backdrop-filter/WebGL могут резко повысить стоимость кадра;
- сложный пользовательский editor придется проектировать отдельно.
