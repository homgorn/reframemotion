# 06. Motion design и визуальная система

## Motion — часть смысла

Переход и easing сообщают отношение между состояниями:

- crossfade — продолжение;
- push — следующий пункт;
- hard cut — разрыв/сигнал внимания;
- focus pull — мягкая смена акцента;
- glitch — нестабильность/цифровой сбой;
- iris/reveal — открытие;
- color dip — закрытие главы.

Использовать эффект потому, что он доступен, — слабое основание.

## Build / breathe / resolve

Каждая сцена:

- **Build 0–30%** — вход элементов;
- **Breathe 30–70%** — чтение и один ambient motion;
- **Resolve 70–100%** — переход или финальный выход.

Частая ошибка — весь контент появляется в первые 300 ms, затем сцена стоит мертво либо, наоборот, все непрерывно пульсирует.

## Easing как характер

- `expo.out` — уверенный быстрый вход;
- `power3.out` — профессиональный;
- `sine.inOut` — мягкий/медитативный;
- `back.out` — игривый overshoot;
- `elastic.out` — редкий выразительный акцент;
- linear/none — только для постоянного механического движения.

Direction rule:

- `.out` для входа;
- `.in` для ухода;
- `.inOut` для перемещения между состояниями.

## Разнообразие без хаоса

Внутри сцены менять:

- направление;
- duration;
- easing;
- stagger rhythm;
- property;
- visual weight.

Но на уровне всего ролика сохранить motion grammar: 1 основной переход, 1–2 акцента, ограниченная библиотека entrances.

## Типографика

Минимальные ориентиры для 1080p:

- headline 60 px+, часто 80–140 px;
- body 20 px+;
- data label 16 px+;
- captions в portrait обычно 48–80 px.

Это не абсолютные числа: viewing distance, output resolution и плотность текста важнее. Проверять на реальном телефоне.

Правила:

- одна выразительная гарнитура на сцену;
- не сочетать две почти одинаковые sans-serif;
- контраст весов заметный, а не 400/600 по привычке;
- `font-variant-numeric: tabular-nums` для колонок/таймеров;
- на dark background компенсировать apparent weight и spacing;
- не использовать принудительный `<br>` для динамического текста;
- измерять text и делать fit/overflow fallback.

## Композиция кадра

Хороший video frame обычно имеет:

- минимум два focal points;
- background treatment;
- foreground content;
- accent/structural layer;
- привязку к краям/зонам;
- путь движения взгляда.

Плавающий небольшой web-card по центру 1920×1080 обычно выглядит как недоделанный слайд.

## Safe areas

Нужны отдельные safe overlays для:

- TikTok/Reels UI;
- YouTube Shorts;
- subtitles/burn-in;
- телевизионных overscan/логотипов при необходимости;
- face/subject detection.

## Transitions by energy

### Calm / premium

- blur crossfade;
- focus pull;
- color dip;
- slow mask;
- 0.5–0.8 s.

### Corporate / explainer

- push;
- staggered blocks;
- vertical reveal;
- 0.3–0.5 s.

### High-energy

- zoom-through;
- overexposure;
- fast chromatic accent;
- 0.15–0.3 s.

Не превращать каждый cut в новый transition demo.

## Data visualization

- шкала и baseline должны быть честными;
- анимация не должна скрывать различия;
- числа остаются читаемыми после движения;
- label следует за data object;
- цвета не должны быть единственным носителем смысла;
- избегать слишком мелких осей в social format;
- при batch data проверять min/max/negative/zero/null.

## Visual anti-patterns

- случайные gradients и neon glow без brand rationale;
- одинаковый `y:30, opacity:0` для всего;
- бесконечный ambient zoom каждой сцены;
- generic particle background;
- rainbow audio spectrum;
- слишком частый glitch;
- grid/tile transition, видимый как дешевый repeating pattern;
- motion blur/filters, которые делают текст нечитаемым;
- 14 px body copy в 1080p;
- 10 строк текста на 2 секунды.
