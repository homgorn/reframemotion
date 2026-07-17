# 07. Звук, голос и субтитры

## Аудио — отдельный производственный слой

Состав:

- voiceover/dialogue;
- music;
- SFX;
- ambience;
- loudness/true peak;
- captions/transcript.

Не смешивать все на этапе композиции без предварительной нормализации.

## Voiceover pipeline

1. Финализировать spoken script.
2. Добавить pronunciation map для брендов, чисел, аббревиатур.
3. Сгенерировать или записать voice.
4. Удалить очевидные артефакты.
5. Нормализовать/компрессировать умеренно.
6. Получить word-level timestamps.
7. Обновить storyboard.
8. Только после этого фиксировать scene durations.

## HyperFrames TTS

Встроенный workflow использует локальный Kokoro-82M. Плюсы: no API key, локальность, воспроизводимость. Ограничения: поддержка языков/голосов и качество конкретного языка нужно проверять на тексте проекта.

```bash
npx hyperframes tts script.txt --voice af_nova --output narration.wav
npx hyperframes transcribe narration.wav
```

Для русского языка не считать поддержку автоматически достаточной: проверить доступный phonemizer/voice либо использовать внешний TTS с корректной лицензией.

## Whisper language pitfall

Не использовать `.en` model для неанглийского аудио. Она может переводить вместо транскрибирования. Правило:

- язык известен и не English → multilingual model + `--language`;
- English → `.en` допустим;
- язык неизвестен → multilingual model auto-detect.

## Caption grouping

- high energy: 2–3 слова;
- conversational: 3–5;
- calm: 4–6;
- break по sentence/pause;
- одна caption group одновременно;
- активное слово можно выделять, но не превращать каждую фразу в visual noise.

## Caption positioning

Landscape: нижняя зона с достаточным отступом.  
Portrait: lower-middle, но выше platform controls.  
Всегда учитывать лицо/объект и CTA.

Нужны fallback layouts:

- одна строка;
- две строки;
- длинное слово;
- число/URL;
- RTL;
- Cyrillic/Latin mixed;
- emoji/glyph fallback.

## Deterministic captions

Captions должны быть привязаны к timestamps/frames. В HyperFrames после exit рекомендуется hard kill состояния. В Remotion caption page живет в Sequence с точным duration.

## Включаемые субтитры и silent-text

Для масштабного производства не плодить отдельные HTML-композиции под каждый вариант. В HyperFrames объявлять переменные композиции:

```json
{
  "exportProfile": {"type": "string", "default": "final"},
  "audioMode": {"type": "string", "default": "normal"},
  "captions": {"type": "string", "default": "off"}
}
```

Практический контракт:

- `captions=off` — субтитры скрыты, `.vtt`/`.srt` всё равно сохраняются рядом.
- `captions=on` — burn-in subtitles в видео.
- `audioMode=muted` — все audio-треки получают volume/mute.
- `exportProfile=demo` — добавляется видимый DEMO watermark.
- `exportProfile=silent_text` — видео без звука, субтитры включены, текст отдельно в `exports/script-text.txt`.

## Audio-reactive motion

Сигнал должен менять meaningful visual property:

- bass → мягкий scale background/accent;
- amplitude → glow/intensity;
- mids → shape deformation;
- speech emphasis → highlight word/card.

Необязательно рисовать spectrum bars. Предварительно извлеченные данные надежнее runtime Web Audio API.

## Mixing guidance

Ориентиры зависят от платформы, поэтому измерять итоговый файл. Практически:

- голос — главный;
- music ducking под речь;
- SFX не перекрывает согласные;
- true peak оставляет headroom;
- short-form не должен быть постоянно максимально громким;
- проверять mono compatibility.

## Copyright и provenance

Для каждого audio asset хранить:

- source;
- license;
- proof of purchase/permission;
- permitted channels/territories;
- expiry;
- attribution requirement;
- generated voice provider/model/terms;
- consent, если клонируется голос человека.

## QA аудио

- нет клиппинга;
- начало/конец не обрезаны;
- speech intelligible на телефоне;
- captions совпадают с речью;
- pronunciation correct;
- pause duration естественная;
- no duplicated audio track;
- sample rate/channel layout ожидаемые;
- финальный MP4 содержит нужные streams.
