# 03. Remotion

## Архитектурная модель

Remotion описывает кадр React-компонентом. Визуальное состояние должно быть функцией:

```text
frame + fps + props + замороженные assets = кадр
```

Ключевые primitives:

- `<Composition>` — регистрация видео;
- `useCurrentFrame()` — локальный номер кадра;
- `useVideoConfig()` — fps, width, height, duration;
- `interpolate()` и `Easing` — детерминированная анимация;
- `<Sequence>`, `<Series>`, `<TransitionSeries>` — временная структура;
- `<Img>`, `Video`, `Audio` — media;
- `calculateMetadata()` — динамические duration/dimensions/props;
- `@remotion/player` — runtime preview в React app;
- `@remotion/renderer` — server-side render;
- `@remotion/lambda` — параллельный AWS render.

## Создание проекта

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npx remotion studio
```

Для агента официально поддерживаются skills, которые можно установить отдельно. В production фиксируйте exact versions всех пакетов `remotion` и `@remotion/*` одной версии.

## Composition

```tsx
import {Composition} from 'remotion';
import {Main, type MainProps} from './Main';

export const RemotionRoot = () => (
  <Composition<MainProps>
    id="Main"
    component={Main}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{title: 'Демо', accent: '#ff5a36'}}
  />
);
```

## Frame-derived animation

```tsx
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

const opacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
  easing: Easing.bezier(0.16, 1, 0.3, 1),
});
```

Правила:

- CSS transitions и CSS keyframe animations не использовать;
- Tailwind animation classes не использовать;
- `spring()` применять, когда нужна физическая динамика, а не по умолчанию;
- clamp почти всегда нужен для предсказуемого состояния до/после диапазона;
- случайность — только seeded и привязанная к данным/кадру;
- не читать wall-clock time.

## Sequencing

### Sequence

```tsx
<Sequence from={30} durationInFrames={90} premountFor={30}>
  <Scene />
</Sequence>
```

`useCurrentFrame()` внутри Sequence начинается с 0. Для inline-layout использовать `layout="none"`.

### Series

Использовать, когда сцены идут последовательно и их длительности складываются автоматически.

### TransitionSeries

Использовать для переходов с перекрытием сцен. Помнить: переход уменьшает итоговую длительность, потому что соседние сцены перекрываются.

## Media

Актуальная рекомендация навыка — `Video` и `Audio` из `@remotion/media`:

```tsx
import {Video, Audio} from '@remotion/media';
import {staticFile} from 'remotion';

<Video src={staticFile('clip.mp4')} />
<Audio src={staticFile('music.mp3')} />
```

Изображения:

```tsx
import {Img, staticFile} from 'remotion';
<Img src={staticFile('logo.png')} />
```

Assets хранить в `public/` или использовать стабильные remote URLs. Для production лучше скачать, проверить checksum и раздавать из контролируемого object storage.

## Dynamic metadata

```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props, abortSignal}) => {
  const data = await fetch(props.dataUrl, {signal: abortSignal}).then(r => r.json());
  return {
    durationInFrames: Math.ceil(data.durationSeconds * 30),
    props: {...props, data},
  };
};
```

Не превращать `calculateMetadata` в скрытый оркестратор всего production. Он должен быстро получить/вычислить metadata и быть отменяемым. Тяжелые AI-задачи, транскрипцию и media normalization выполнять заранее.

## Parameterized videos

Использовать строгий schema contract, обычно Zod:

- text limits;
- URL protocol allowlist;
- enumerations для layout/style;
- min/max чисел;
- branded asset IDs вместо произвольных путей;
- defaults и schema version.

Это позволяет одному шаблону обслуживать Studio, Player, API и batch render.

## Player

`@remotion/player` позволяет встроить композицию в React app и менять props runtime. Это основа для:

- SaaS-конструктора;
- персонализатора;
- редактора рекламных роликов;
- approval UI;
- предпросмотра перед оплатой/рендером.

Обязательные темы:

- preloading;
- premounting;
- buffer state;
- предотвращение flicker;
- browser autoplay policies;
- custom controls;
- ограничение частоты тяжелых re-renders.

Player — не гарантия того, что server render идентичен при нестабильных remote assets или browser-specific APIs. Проверять representative frames server-side.

## Server-side rendering

Типовой API:

```tsx
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const serveUrl = await bundle({entryPoint: './src/index.ts'});
const inputProps = {title: 'Отчет'};
const composition = await selectComposition({
  serveUrl,
  id: 'Main',
  inputProps,
});

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: 'out/video.mp4',
  inputProps,
});
```

Bundle переиспользовать для серии renders. Не пересобирать проект на каждый row.

## Lambda

Remotion Lambda разбивает видео на chunks, параллельно рендерит их в AWS Lambda, затем склеивает и сохраняет в S3. Это зрелый путь для burst scale, но требует:

- IAM и bucket security;
- квот concurrency;
- version parity функции и проекта;
- webhooks/status tracking;
- lifecycle cleanup;
- cost monitoring;
- ограничения duration/storage/timeout.

## Cloud Run

На дату исследования официальный `@remotion/cloudrun` имеет Alpha status и не развивается активно. Для нового GCP production не следует выбирать его без осознанного принятия риска. Альтернатива — обычный SSR в собственном контейнере/очереди.

## Captions

Экосистема включает `@remotion/captions`. Практический pipeline:

1. получить word-level timestamps;
2. объединить слова в страницы/фразы;
3. перевести ms → frames;
4. каждую страницу обернуть в Sequence;
5. активное слово определять по текущему времени;
6. предусмотреть safe area и динамический fit.

## Audio visualization

`@remotion/media-utils` предоставляет анализ/визуализацию аудио. Использовать сигнал для meaningful motion, а не обязательно рисовать generic equalizer. Для тяжелого анализа данные лучше извлечь заранее и закэшировать.

## Типовые ошибки

1. CSS animation вместо frame-derived state.
2. Данные меняются во время рендера.
3. `Math.random()` без seed.
4. Remote asset истек/редиректит/блокирует CORS.
5. Неправильная локальная frame-система внутри Sequence.
6. Transition overlap не учтен в total duration.
7. Шрифт не загрузился до кадра.
8. Слишком тяжелый React tree на каждом кадре.
9. Bundle пересоздается на каждый render.
10. Input props не валидируются.
11. Player выглядит нормально, а server renderer получает другие assets.
12. Все пакеты `@remotion/*` разных версий.
13. Лицензия не проверена до коммерческого запуска.

## Сильные стороны

- React/TypeScript/type safety;
- большой набор packages и docs;
- Player и приложение вокруг видео;
- зрелый Lambda render;
- переиспользование компонентов;
- parameter schemas;
- хорошая база для video SaaS/editor.

## Риски

- специальная коммерческая лицензия;
- React overhead и сложность экосистемы;
- API/packages развиваются, старые примеры быстро устаревают;
- Cloud Run нельзя считать равной по зрелости Lambda;
- браузерный render требует строгой детерминированности и asset discipline.
