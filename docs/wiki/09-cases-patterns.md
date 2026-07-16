# 09. Кейсы и продуктовые паттерны

Ниже — типология, а не обещание, что каждый кейс одинаково выгоден.

## 1. Персонализированные видео

**Вход:** CRM row, имя, компания, метрики, персональный CTA.  
**Выход:** сотни/тысячи роликов одного template family.

Критично:

- schema and length limits;
- text fitting;
- idempotency;
- batch manifest;
- privacy/retention;
- representative QA.

Подходит обоим движкам. HyperFrames имеет variables/batch; Remotion — input props/SSR/Lambda.

## 2. Product launch / feature announcement

**Вход:** сайт, Figma, screenshots, changelog.  
**Структура:** friction → reveal → capabilities → proof → CTA.

HyperFrames особенно удобен для capture website и DOM-motion. Remotion — когда UI уже React и компоненты можно переиспользовать.

## 3. PR-to-video / release notes

**Вход:** GitHub PR/diff/issues.  
**Сцены:** summary, code diff, before/after, benchmark, migration note.

Автоматизируемо через GitHub MCP/webhook. Нужен human review, чтобы не публиковать секреты, internal URLs или неверную интерпретацию diff.

## 4. Faceless explainer

**Вход:** статья/бриф/данные.  
**Состав:** VO, kinetic typography, diagrams, stock/generated assets, captions.

Риск — generic AI look. Нужны DESIGN.md, factual citations и asset provenance.

## 5. Shorts recut

**Вход:** длинное видео.  
**Pipeline:** transcript → semantic moments → reframing → captions → B-roll/graphics → output variants.

FFmpeg/ML делают анализ и нарезку; browser framework — branding/captions/layout.

## 6. Talking-head enhancement

- face-aware crop;
- silence trim;
- jump cuts;
- lower thirds;
- captions;
- contextual overlays;
- progress/chapters.

Не использовать слишком частые punch zoom и emoji overlays: они быстро превращаются в шаблонный шум.

## 7. Data story / annual report

**Вход:** CSV/API/BI export.  
**Сцены:** headline metric, trend, comparison, explanation, implication.

Нужны data validation, honest scales, tabular numbers, source/date labels и null handling.

## 8. E-commerce catalog video

**Вход:** product feed, images, price, features, reviews.  
**Выход:** SKU videos, category reels, dynamic ads.

Проверять:

- availability/price freshness;
- image rights;
- prohibited claims;
- localization/currency;
- variation data;
- automatic text overflow.

## 9. Real estate/listing video

- photos/video;
- map/route;
- property facts;
- agent CTA;
- aspect ratios per platform.

Нельзя автоматически преувеличивать характеристики. Данные должны исходить из listing source.

## 10. Route/map animation

Remotion имеет documented map patterns; HyperFrames может использовать DOM/SVG/WebGL. Для карты:

- выбрать static map для простого результата;
- MapLibre/Mapbox для интерактивной географии;
- проверить token/licensing/attribution;
- заранее кэшировать tiles или использовать approved static assets.

## 11. Website-to-video

HyperFrames имеет формализованный pipeline Capture → DESIGN → SCRIPT/STORYBOARD → VO → compositions → validate. Кейсы:

- homepage promo;
- product tour;
- onboarding;
- redesign before/after;
- service explainer;
- localized social ads.

Не просто скроллить сайт. Видео должно переупаковывать иерархию под время и экран.

## 12. PDF/deck/report-to-video

- извлечь структуру и figures;
- не превращать страницы PDF в slideshow без адаптации;
- выделить 3–7 выводов;
- перерисовать charts в video-safe layout;
- указать source/date.

## 13. Educational/tutorial

- outcome upfront;
- step highlighting;
- cursor/callouts;
- zoom only around action;
- captions and chapter markers;
- code diff or terminal typing;
- error prevention.

## 14. Audio/music visual

Audio-reactivity должна поддерживать narrative identity. Хорошо: lyric emphasis, typography rhythm, scene energy. Слабо: generic bars/orbs/rainbow.

## 15. Transparent overlays

- lower thirds;
- CTA;
- alerts;
- scoreboards;
- UI frames;
- transitions.

Выход: ProRes 4444/MOV или WebM alpha; проверить alpha interpretation в монтажной системе.

## 16. Video SaaS / editor

Официальный Remotion case Typeframes описывает Player для real-time preview и Lambda для render. Это репрезентативный архитектурный паттерн:

```text
React editor → validated props → Player preview
→ render API → queue/Lambda → S3 → webhook → download
```

HyperFrames может использовать собственный Studio/player/SDK, но экосистема пользовательских editor patterns моложе.

## 17. Programmatic marketing at scale

- гео-варианты;
- отрасли;
- customer segments;
- A/B hooks;
- language variants;
- data-triggered videos.

Главный риск — масштабировать плохой шаблон. Сначала доказать качество и конверсию на ограниченной выборке.

## 18. Internal operations

- weekly metrics recap;
- incident summary;
- sales enablement;
- onboarding;
- release digest;
- customer success report.

Внутренние видео часто экономически оправданнее публичных creative experiments, потому что inputs структурированы, а требования к brand polish умереннее.
