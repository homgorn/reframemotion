# Project catalog

`projects/` хранит легкие git-friendly манифесты сайтов и видео-проектов. Тяжелые MP4/WAV, временные workspaces и render outputs остаются в `data/outputs/`, release artifacts или внешнем object storage.

Структура:

```text
projects/
  rospan.ru/
    site.json
    videos/
      rospan-site-3min.json
      rospan-site-6min.json
```

`site.json` описывает сайт/клиента. JSON в `videos/` описывает конкретный ролик, его источник, режим звука, проверки, preview URL и артефакты.

Dashboard читает эти файлы через `GET /api/catalog`, `GET /api/sites` и `GET /api/projects`.

