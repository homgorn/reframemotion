# 01. Выбор стека

## Решение за 60 секунд

### Выбирайте HyperFrames, когда

- видео удобно описывать как HTML/CSS/GSAP;
- агент должен прямо редактировать DOM и стили;
- нужно снять сайт и превратить его в промо/тур;
- важны встроенные capture, registry, storyboard-пайплайн;
- требуется Apache 2.0 без коммерческой лицензии движка;
- нужна воспроизводимость через Docker и управляемый Chrome;
- проект — motion graphics, data-story, product launch, PR-to-video, social reel.

### Выбирайте Remotion, когда

- команда уже сильна в React/TypeScript;
- нужен `<Player>` внутри веб-приложения;
- нужен параметризуемый видео-шаблон с Zod/props;
- планируется визуальный редактор или timeline UI;
- важен зрелый AWS Lambda pipeline;
- нужно переиспользовать React-компоненты, дизайн-систему и типы;
- нужна интеграция с Next.js/React Router и существующим SaaS.

### Выбирайте чистый FFmpeg, когда

- нужны нарезка, склейка, конвертация, ресайз, watermark, loudness normalization;
- композиция не требует браузерного layout и сложной типографики;
- входной шаблон фиксирован и может быть описан filtergraph;
- критична минимальная стоимость/время рендера.

## Сравнение

| Критерий | HyperFrames | Remotion | FFmpeg |
|---|---|---|---|
| Модель | HTML + CSS + GSAP + data-атрибуты | React + frame-derived state | CLI/filtergraph |
| Основной язык | HTML/CSS/JS | TypeScript/React | CLI/C/C++ ecosystem |
| Preview | Studio/browser | Remotion Studio/Player | обычно внешний player |
| Интерактивный Player | есть package/player, экосистема моложе | зрелый `@remotion/player` | нет |
| Массовая персонализация | variables + batch | input props + SSR/Lambda | скрипты/фильтры |
| Захват сайта | встроенный workflow | внешний Playwright/capture | нет |
| Агентная генерация | один из главных сценариев | официальные Agent Skills | требует собственных правил |
| Облачный рендер | hosted/AWS/GCP/свой сервер | Lambda; Cloud Run alpha; SSR | любой compute |
| Лицензия | Apache 2.0 | специальная лицензия Remotion | LGPL/GPL-компоненты зависят от сборки |
| Лучшее применение | выразительные DOM motion graphics | React video SaaS/editors | media processing |

## Практическая стратегия выбора

Оцените проект по пяти осям от 0 до 5:

1. **React reuse** — насколько важны существующие React-компоненты.
2. **DOM freedom** — насколько сцены похожи на веб-композицию/инфографику.
3. **Editor requirement** — нужен ли пользовательский редактор и live preview.
4. **Render scale** — частота и пиковая параллельность.
5. **License sensitivity** — допустима ли коммерческая лицензия.

Пример:

```text
React reuse: 5
DOM freedom: 2
Editor: 5
Scale: 4
License sensitivity: 1
=> Remotion
```

```text
React reuse: 0
DOM freedom: 5
Editor: 1
Scale: 3
License sensitivity: 5
=> HyperFrames
```

## Когда возможен гибрид

Гибрид оправдан, если граница четкая:

- FFmpeg подготавливает и нормализует медиа;
- Playwright/capture извлекает UI;
- один движок отвечает за финальную композицию;
- второй не встраивается в каждый кадр без необходимости.

Плохой гибрид: Remotion запускает HyperFrames в iframe, который внутри управляет собственным timeline. Это удваивает источники времени, усложняет seek, preload, отладку и детерминизм.

Хороший гибрид: отдельный HyperFrames-ролик экспортируется в прозрачный ProRes/WebM и затем используется как готовый слой в Remotion — или наоборот. Цена — дополнительный encode/decode и промежуточное хранилище.

## Решение для типовых задач

- 1000 персональных роликов из CRM: Remotion или HyperFrames; выбирать по команде и лицензии, обязательно batch/job queue.
- Видео из сайта: HyperFrames.
- React-видеоредактор для клиентов: Remotion.
- Автоматическая нарезка под Shorts: FFmpeg + выбранный движок для титров/брендинга.
- Инфографика из CSV: оба; HyperFrames проще для DOM/GSAP, Remotion — для типизированного data app.
- Прозрачный lower-third pack: оба; экспорт ProRes 4444/MOV или WebM alpha.
