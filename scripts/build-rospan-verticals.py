import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
VIDEOS = WORKSPACE / "videos"
SOURCE = VIDEOS / "rospan-site-3min"
PROJECTS = ROOT / "projects" / "rospan.ru" / "videos"

ASSET_NAMES = [
    "logo-final.svg",
    "hero-image-item-closing.jpg",
    "panels-container.jpg",
    "project-card.jpg",
    "order-order-sample.jpg",
    "order-order-consultation.jpg",
    "reviews-container.jpg",
    "image-11.jpg",
    "image-38.jpg",
    "image-39.jpg",
    "image-49.jpg",
]

PROJECT_DEFS = [
    {
        "id": "rospan-vertical-2min-conversion",
        "title": "ROSPAN 2-minute vertical conversion presentation",
        "duration": 120,
        "voice": "ru-RU-DmitryNeural",
        "rate": "-14%",
        "scenes": [
            {
                "kicker": "ПЕРВЫЕ 3 СЕКУНДЫ",
                "headline": "Объект нельзя отделывать материалом, который быстро сдается.",
                "body": "В публичных пространствах стены каждый день встречают людей, уборку, удары и строгие нормы.",
                "image": "hero-image-item-closing.jpg",
                "caption": "Хук: меньше риска на объекте",
                "start": 0,
                "duration": 14,
            },
            {
                "kicker": "РЕШЕНИЕ",
                "headline": "РОСПАН — российские панели для стен и потолков.",
                "body": "Для клиник, школ, офисов, HoReCa, транспорта и объектов с высокой ежедневной нагрузкой.",
                "image": "panels-container.jpg",
                "caption": "Стеновые и потолочные решения",
                "start": 14,
                "duration": 16,
            },
            {
                "kicker": "ПРОЧНОСТЬ",
                "headline": "Материал рассчитан на эксплуатацию, а не только на красивый первый день.",
                "body": "Покрытия устойчивы к влаге, уборке и повреждениям. Поврежденный элемент можно заменить локально.",
                "image": "image-11.jpg",
                "caption": "Уход, износ, ремонтопригодность",
                "start": 30,
                "duration": 16,
            },
            {
                "kicker": "НОРМЫ",
                "headline": "Для строгих требований есть решения КМ0 и КМ1.",
                "body": "Это снижает риск на этапах согласования, эксплуатации и приемки объекта.",
                "image": "image-38.jpg",
                "caption": "Пожарная безопасность",
                "start": 46,
                "duration": 15,
            },
            {
                "kicker": "СРОКИ",
                "headline": "Монтаж без мокрых процессов помогает быстрее сдавать помещения.",
                "body": "Система крепления и декоративные профили ускоряют отделку и оставляют доступ к коммуникациям.",
                "image": "project-card.jpg",
                "caption": "Быстрее монтаж — меньше простоя",
                "start": 61,
                "duration": 16,
            },
            {
                "kicker": "ДИЗАЙН",
                "headline": "Более 100 декоров для разных интерьеров.",
                "body": "Спокойная клиника, теплая школа, строгий офис или ресторан — решение можно подобрать под задачу.",
                "image": "image-39.jpg",
                "caption": "Декоры под проект",
                "start": 77,
                "duration": 15,
            },
            {
                "kicker": "ДОКАЗАТЕЛЬСТВА",
                "headline": "Решения РОСПАН уже работают в реальных объектах.",
                "body": "Поликлиники, школы, офисы, спорткомплексы, рестораны, суды, отели и производственные помещения.",
                "image": "image-49.jpg",
                "caption": "Реальные объекты",
                "start": 92,
                "duration": 14,
            },
            {
                "kicker": "CTA",
                "headline": "Закажите образцы 20 на 30 сантиметров.",
                "body": "Сравните фактуру и цвет вживую. Получите расчет материала под ваш объект и сроки поставки.",
                "image": "order-order-sample.jpg",
                "caption": "Образцы и расчет",
                "start": 106,
                "duration": 14,
            },
        ],
        "voice_text": (
            "Объект нельзя отделывать материалом, который быстро сдается. "
            "В клинике, школе, офисе или ресторане стены каждый день выдерживают людей, уборку, удары и строгие нормы. "
            "РОСПАН производит российские стеновые и потолочные панели для общественных и коммерческих пространств. "
            "Это решение для проектов, где важны внешний вид, прочность, пожарная безопасность и скорость монтажа. "
            "Панели устойчивы к влаге, ежедневной уборке и повреждениям. Если элемент пострадал, его можно заменить локально, без полной переделки стены. "
            "Для объектов со строгими требованиями есть решения КМ0 и КМ1. Это помогает снижать риски на согласовании, приемке и дальнейшей эксплуатации. "
            "Монтаж проходит без мокрых процессов. Продуманная система крепления ускоряет отделку и оставляет доступ к коммуникациям. "
            "Более ста декоров помогают собрать интерьер под задачу: спокойная клиника, теплая школа, строгий офис, ресторан или брендированное пространство. "
            "Решения РОСПАН уже применяются в поликлиниках, школах, офисах, спорткомплексах, ресторанах, судах, отелях и производственных помещениях. "
            "Начните с образцов двадцать на тридцать сантиметров. Сравните фактуру и цвет вживую, получите расчет материала под ваш объект и сроки поставки."
        ),
    },
    {
        "id": "rospan-reels-15s-hook",
        "title": "ROSPAN 15-second vertical reel with hook",
        "duration": 15,
        "voice": "ru-RU-DmitryNeural",
        "rate": "+0%",
        "scenes": [
            {"kicker": "0-3 СЕК", "headline": "Стены в объекте устают быстрее, чем кажется.", "body": "Люди, уборка, удары, нормы.", "image": "hero-image-item-closing.jpg", "caption": "Хук", "start": 0, "duration": 4},
            {"kicker": "РЕШЕНИЕ", "headline": "РОСПАН: панели для сильных помещений.", "body": "КМ0/КМ1, быстрый монтаж, более 100 декоров.", "image": "panels-container.jpg", "caption": "Польза", "start": 4, "duration": 6},
            {"kicker": "CTA", "headline": "Закажите образцы 20x30 см.", "body": "Подберите материал под ваш объект.", "image": "order-order-sample.jpg", "caption": "Действие", "start": 10, "duration": 5},
        ],
        "voice_text": (
            "Стены в объекте каждый день выдерживают людей, уборку и удары. "
            "РОСПАН: панели КМ0 и КМ1, быстрый монтаж, более ста декоров. "
            "Закажите образцы и расчет под ваш объект."
        ),
    },
    {
        "id": "rospan-reels-30s-proof",
        "title": "ROSPAN 30-second vertical reel with proof",
        "duration": 30,
        "voice": "ru-RU-DmitryNeural",
        "rate": "+0%",
        "scenes": [
            {"kicker": "0-3 СЕК", "headline": "Ремонт через год — это не дизайн. Это ошибка выбора.", "body": "Для публичных помещений нужен материал с запасом.", "image": "image-11.jpg", "caption": "Хук", "start": 0, "duration": 6},
            {"kicker": "РОСПАН", "headline": "Стеновые и потолочные панели для объектов с нагрузкой.", "body": "Клиники, школы, офисы, рестораны, транспорт.", "image": "project-card.jpg", "caption": "Сегменты", "start": 6, "duration": 8},
            {"kicker": "АРГУМЕНТЫ", "headline": "КМ0/КМ1, быстрый монтаж, локальная замена.", "body": "Меньше простоев, проще уход, спокойнее эксплуатация.", "image": "image-38.jpg", "caption": "Доказательства", "start": 14, "duration": 9},
            {"kicker": "CTA", "headline": "Получите образцы и расчет.", "body": "Проверьте цвет, фактуру и сроки поставки до заказа.", "image": "order-order-consultation.jpg", "caption": "Заявка", "start": 23, "duration": 7},
        ],
        "voice_text": (
            "Ремонт через год — это не дизайн, а ошибка выбора. "
            "РОСПАН производит панели для клиник, школ, офисов, ресторанов и транспорта. "
            "КМ0 и КМ1, быстрый монтаж, локальная замена элементов, более ста декоров. "
            "Получите образцы и расчет до заказа."
        ),
    },
    {
        "id": "rospan-reels-45s-cta",
        "title": "ROSPAN 45-second vertical reel with CTA",
        "duration": 45,
        "voice": "ru-RU-DmitryNeural",
        "rate": "-10%",
        "scenes": [
            {"kicker": "0-3 СЕК", "headline": "Если отделка не выдержит нагрузку, объект снова теряет деньги.", "body": "Материал должен работать после открытия.", "image": "hero-image-item-closing.jpg", "caption": "Хук", "start": 0, "duration": 7},
            {"kicker": "РЕШЕНИЕ", "headline": "РОСПАН — панели для стен и потолков в коммерческих пространствах.", "body": "Стабильный вид, уход, ремонтопригодность.", "image": "panels-container.jpg", "caption": "Решение", "start": 7, "duration": 9},
            {"kicker": "БЕЗОПАСНОСТЬ", "headline": "КМ0 и КМ1 для объектов со строгими требованиями.", "body": "Аргумент для проектировщика и службы эксплуатации.", "image": "image-38.jpg", "caption": "Нормы", "start": 16, "duration": 8},
            {"kicker": "СРОКИ", "headline": "Монтаж без мокрых процессов помогает быстрее сдавать помещения.", "body": "Меньше простоев и понятнее график работ.", "image": "project-card.jpg", "caption": "Монтаж", "start": 24, "duration": 8},
            {"kicker": "ВЫБОР", "headline": "Более 100 декоров под интерьер и бренд.", "body": "От спокойной клиники до ресторана и офиса.", "image": "image-39.jpg", "caption": "Декоры", "start": 32, "duration": 6},
            {"kicker": "CTA", "headline": "Начните с образцов и расчета.", "body": "Оцените материал вживую и получите решение под ваш объект.", "image": "order-order-sample.jpg", "caption": "Заявка", "start": 38, "duration": 7},
        ],
        "voice_text": (
            "Если отделка не выдержит нагрузку, объект снова теряет деньги. "
            "Материал должен работать после открытия, а не только красиво выглядеть на приемке. "
            "РОСПАН производит панели для стен и потолков в коммерческих и общественных пространствах. "
            "Есть решения КМ0 и КМ1, быстрый монтаж без мокрых процессов, локальная замена элементов и более ста декоров. "
            "Подберите материал под клинику, школу, офис, ресторан или транспортный объект. "
            "Начните с образцов и расчета: оцените фактуру вживую и получите решение под ваш проект."
        ),
    },
]


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>{title}</title>
  <script src="vendor/gsap.min.js"></script>
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #061426; font-family: Arial, sans-serif; }}
    #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #061426; color: #f7fbff; }}
    .scene {{ position: absolute; inset: 0; opacity: 0; overflow: hidden; background: #07172a; }}
    .scene:first-of-type {{ opacity: 1; }}
    .scene img.bg {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.02); opacity: .42; }}
    .content {{ position: relative; z-index: 2; width: 100%; height: 100%; padding: 96px 74px 110px; display: flex; flex-direction: column; justify-content: space-between; gap: 42px; }}
    .top {{ display: flex; align-items: center; justify-content: space-between; gap: 22px; }}
    .logo {{ width: 245px; height: auto; }}
    .kicker {{ color: #74d8ff; font-size: 30px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }}
    .main {{ display: flex; flex-direction: column; gap: 34px; }}
    h1 {{ margin: 0; max-width: 930px; font-family: Georgia, 'Times New Roman', serif; font-size: 86px; line-height: .98; font-weight: 900; letter-spacing: 0; }}
    p {{ margin: 0; max-width: 870px; font-size: 38px; line-height: 1.18; font-weight: 700; color: #e8f2ff; }}
    .proof {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }}
    .pill {{ border: 1px solid rgba(255,255,255,.28); background: rgba(8,28,48,.82); border-radius: 8px; padding: 20px 22px; font-size: 27px; font-weight: 900; color: #ffffff; }}
    .caption {{ align-self: flex-start; border-left: 8px solid #e22c2c; padding: 18px 24px; background: rgba(255,255,255,.12); font-size: 31px; font-weight: 900; color: #fff; }}
    .cta {{ display: inline-flex; align-items: center; justify-content: center; min-height: 96px; padding: 24px 34px; background: #e22c2c; color: #fff; font-size: 34px; font-weight: 900; border-radius: 8px; }}
    .progress {{ position: absolute; z-index: 3; left: 0; bottom: 0; height: 12px; width: 0; background: #74d8ff; }}
  </style>
</head>
<body>
  <div id="root" data-composition-id="{id}" data-start="0" data-width="1080" data-height="1920" data-duration="{duration}">
    <audio id="voice" src="audio/soundtrack.wav" data-start="0" data-duration="{duration}" data-track-index="2" data-volume="1"></audio>
{audio_extra}
{scenes_html}
    <div class="progress"></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {{}};
    var tl = gsap.timeline({{ paused: true }});
    var scenes = {scenes_json};
    scenes.forEach(function(scene, index) {{
      tl.set("#" + scene.id, {{ opacity: index === 0 ? 1 : 0 }}, 0);
    }});
    scenes.forEach(function(scene, index) {{
      var root = "#" + scene.id;
      if (index > 0) {{
        var prev = "#" + scenes[index - 1].id;
        tl.set(root, {{ opacity: 0 }}, scene.start - 0.42);
        tl.to(prev, {{ opacity: 0.08, duration: 0.36, ease: "power2.inOut" }}, scene.start - 0.35);
        tl.to(root, {{ opacity: 1, duration: 0.48, ease: "power2.out" }}, scene.start - 0.30);
      }}
      tl.from(root + " .kicker", {{ opacity: 0, y: -20, duration: 0.42, ease: "power2.out" }}, scene.start + 0.18);
      tl.from(root + " h1", {{ opacity: 0, y: 58, duration: 0.72, ease: "power3.out" }}, scene.start + 0.38);
      tl.from(root + " p", {{ opacity: 0, y: 34, duration: 0.62, ease: "sine.out" }}, scene.start + 0.78);
      tl.from(root + " .pill", {{ opacity: 0, y: 26, duration: 0.44, stagger: 0.06, ease: "back.out(1.25)" }}, scene.start + 1.05);
      tl.from(root + " .caption", {{ opacity: 0, x: -36, duration: 0.5, ease: "expo.out" }}, scene.start + 1.28);
      tl.fromTo(root + " img.bg", {{ scale: 1.02 }}, {{ scale: 1.075, duration: scene.duration, ease: "none" }}, scene.start);
    }});
    tl.fromTo(".progress", {{ width: 0 }}, {{ width: 1080, duration: {duration}, ease: "none" }}, 0);
    tl.to("#" + scenes[scenes.length - 1].id + " .content", {{ opacity: 0, duration: 0.7, ease: "sine.inOut" }}, {duration} - 0.9);
    window.__timelines["{id}"] = tl;
  </script>
</body>
</html>
"""


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd, check=True)


def copy_assets(project_dir):
    vendor = project_dir / "vendor"
    assets = project_dir / "assets"
    vendor.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE / "vendor" / "gsap.min.js", vendor / "gsap.min.js")
    source_assets = SOURCE / "capture-live" / "assets"
    for name in ASSET_NAMES:
        src = source_assets / name
        if src.exists():
            shutil.copy2(src, assets / name)


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def script_md(project):
    lines = ["# SCRIPT", "", "## Client-facing narration", "", project["voice_text"], "", "## On-screen beats", ""]
    for scene in project["scenes"]:
        lines.append(f"- {scene['start']:>5.1f}s — {scene['headline']} / {scene['body']}")
    return "\n".join(lines) + "\n"


def storyboard_md(project):
    lines = ["# STORYBOARD", "", "Vertical 9:16 conversion video. Hook in first 3 seconds. Client-facing narration only.", ""]
    for scene in project["scenes"]:
        lines.append(f"## {scene['kicker']} ({scene['start']}s)")
        lines.append(f"- Headline: {scene['headline']}")
        lines.append(f"- Visual: assets/{scene['image']}")
        lines.append("- Motion: soft image push, headline lift, proof pills stagger, blur transition.")
        lines.append("")
    return "\n".join(lines)


def design_md(project):
    return f"""# DESIGN

## Format

Vertical 1080x1920, conversion-first social presentation.

## Identity

РОСПАН is presented as practical, technical and reliable: dark engineering blue, bright cyan proof accents, red CTA.

## Typography

Headlines use a strong serif register for authority. Supporting text uses a neutral system sans for clarity. Large sizes only.

## Palette

- Deep blue: #061426
- Panel blue: #07172a
- Proof cyan: #74d8ff
- CTA red: #e22c2c
- White: #f7fbff

## Rules

- No process talk in client narration.
- No mentions of pages, screenshots, render, generators, HyperFrames or tooling.
- First three seconds must state a buyer pain.
- Every video ends with a concrete action.
"""


def html_for(project):
    scenes_html = []
    scenes_json = []
    for idx, scene in enumerate(project["scenes"], start=1):
        sid = f"s{idx:02d}"
        scenes_json.append({"id": sid, "start": scene["start"], "duration": scene["duration"]})
        cta = '<div class="cta">Получить образцы и расчет</div>' if idx == len(project["scenes"]) else ""
        scenes_html.append(f"""    <section class="scene" id="{sid}" data-layout-allow-occlusion="true">
      <img class="bg" src="assets/{scene['image']}" data-layout-allow-overflow="true" alt="">
      <div class="content">
        <div class="top"><img class="logo" src="assets/logo-final.svg" alt="ROSPAN"><div class="kicker">{scene['kicker']}</div></div>
        <div class="main">
          <h1>{scene['headline']}</h1>
          <p>{scene['body']}</p>
          <div class="proof"><div class="pill">КМ0 / КМ1</div><div class="pill">100+ декоров</div><div class="pill">Быстрый монтаж</div><div class="pill">Реальные объекты</div></div>
        </div>
        <div>{cta}<div class="caption">{scene['caption']}</div></div>
      </div>
    </section>""")
    return HTML_TEMPLATE.format(
        id=project["id"],
        title=project["title"],
        duration=project["duration"],
        audio_extra="",
        scenes_html="\n".join(scenes_html),
        scenes_json=json.dumps(scenes_json, ensure_ascii=False),
    )


async def tts(project, project_dir):
    audio_dir = project_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    text_path = project_dir / "narration.txt"
    mp3_path = audio_dir / "voice.mp3"
    voice_wav = audio_dir / "voice.wav"
    music_wav = audio_dir / "music.wav"
    soundtrack = audio_dir / "soundtrack.wav"
    write_text(text_path, project["voice_text"] + "\n")
    communicate = edge_tts.Communicate(project["voice_text"], project["voice"], rate=project["rate"])
    await communicate.save(str(mp3_path))
    run(["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "48000", "-ac", "2", str(voice_wav)])
    duration = str(project["duration"])
    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency=92:duration={duration}:sample_rate=48000",
        "-f", "lavfi", "-i", f"sine=frequency=184:duration={duration}:sample_rate=48000",
        "-filter_complex", "[0:a]volume=0.018[a0];[1:a]volume=0.010[a1];[a0][a1]amix=inputs=2:duration=longest,afade=t=in:st=0:d=1.2,afade=t=out:st={}:d=1.2".format(max(0, project["duration"] - 1.2)),
        "-ar", "48000", "-ac", "2", str(music_wav)
    ])
    run([
        "ffmpeg", "-y", "-i", str(voice_wav), "-i", str(music_wav),
        "-filter_complex", "[0:a]loudnorm=I=-17:LRA=11:TP=-1.5[v];[1:a]volume=0.45[m];[v][m]amix=inputs=2:duration=longest:dropout_transition=0,loudnorm=I=-16:LRA=11:TP=-1.5",
        "-ar", "48000", "-ac", "2", str(soundtrack)
    ])
    probe = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(soundtrack)
    ], text=True)
    audio_duration = round(float(json.loads(probe)["format"]["duration"]), 3)
    timings = {
        "voice": project["voice"],
        "engine": "edge-tts",
        "rate": project["rate"],
        "audioDuration": audio_duration,
        "targetDuration": project["duration"],
        "text": project["voice_text"],
    }
    write_text(audio_dir / "timings.json", json.dumps(timings, ensure_ascii=False, indent=2) + "\n")


def captions(project, project_dir):
    words = project["voice_text"].split()
    chunks = []
    per = max(8, round(len(words) / max(3, project["duration"] / 4)))
    for i in range(0, len(words), per):
        chunks.append(" ".join(words[i:i + per]))

    def ts(seconds):
        ms = int(round((seconds - int(seconds)) * 1000))
        s = int(seconds) % 60
        m = (int(seconds) // 60) % 60
        h = int(seconds) // 3600
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    for idx, chunk in enumerate(chunks, start=1):
        start = (idx - 1) * project["duration"] / len(chunks)
        end = idx * project["duration"] / len(chunks) - 0.12
        lines += [str(idx), f"{ts(start)} --> {ts(end)}", chunk, ""]
    exports = project_dir / "exports"
    exports.mkdir(parents=True, exist_ok=True)
    write_text(exports / "captions.srt", "\n".join(lines))
    write_text(exports / "script-text.txt", project["voice_text"] + "\n")
    for name, values in {
        "demo-watermark.variables.json": {"exportProfile": "demo", "audioMode": "normal", "captions": "on", "watermark": True},
        "final.variables.json": {"exportProfile": "final", "audioMode": "normal", "captions": "off", "watermark": False},
    }.items():
        write_text(exports / name, json.dumps(values, ensure_ascii=False, indent=2) + "\n")


def manifest(project):
    pid = project["id"]
    return {
        "id": pid,
        "title": project["title"],
        "kind": "website-to-video",
        "status": "ready",
        "approvalStatus": "review",
        "engine": "hyperframes",
        "templateId": "custom-hyperframes-site",
        "durationSec": project["duration"],
        "audioMode": "voice+music",
        "aspectRatio": "portrait",
        "formats": [{"id": "portrait", "label": "Vertical 9:16", "width": 1080, "height": 1920}],
        "sourcePath": f"videos/{pid}",
        "previewUrl": f"http://localhost:3030/#project/{pid}",
        "sourceUrls": ["https://rospan.ru/"],
        "brief": {
            "goal": "Conversion-focused vertical B2B presentation for ROSPAN panels.",
            "audience": "Architects, contractors, procurement and facility owners.",
            "cta": "Request samples and project calculation.",
            "style": "Technical, confident, direct response, client-facing only.",
        },
        "tags": ["rospan", "vertical", "conversion", "voice", "cta"],
        "checks": {"contentReview": {"status": "pending", "errors": 0, "warnings": 0}},
        "artifacts": [
            {"type": "source", "label": "Local source", "path": f"videos/{pid}"},
            {"type": "script", "label": "Script", "path": f"videos/{pid}/SCRIPT.md"},
            {"type": "storyboard", "label": "Storyboard", "path": f"videos/{pid}/STORYBOARD.md"},
            {"type": "render", "label": "Final MP4", "path": f"videos/{pid}/renders/{pid}-final.mp4"},
            {"type": "audio", "label": "Mixed soundtrack WAV", "path": f"videos/{pid}/audio/soundtrack.wav"},
            {"type": "subtitle", "label": "Captions SRT", "path": f"videos/{pid}/exports/captions.srt"},
            {"type": "text", "label": "Script text sidecar", "path": f"videos/{pid}/exports/script-text.txt"},
        ],
        "exportProfiles": [
            {
                "id": "demo_watermark",
                "label": "DEMO",
                "description": "Client preview with watermark, audio and captions.",
                "watermark": True,
                "audioMode": "normal",
                "captions": "on",
                "approvalRequired": False,
                "variablesPath": "exports/demo-watermark.variables.json",
                "variables": {"exportProfile": "demo", "audioMode": "normal", "captions": "on"},
                "outputSuffix": "demo-watermark",
                "renderCommand": f"npx hyperframes render videos/{pid} --variables-file videos/{pid}/exports/demo-watermark.variables.json --output videos/{pid}/renders/{pid}-demo-watermark.mp4 --fps 30 --quality standard",
                "artifacts": [{"type": "render", "label": "DEMO MP4 target", "path": f"videos/{pid}/renders/{pid}-demo-watermark.mp4"}],
            },
            {
                "id": "final_master",
                "label": "FINAL",
                "description": "Clean final export after approval.",
                "watermark": False,
                "audioMode": "normal",
                "captions": "off",
                "approvalRequired": True,
                "variablesPath": "exports/final.variables.json",
                "variables": {"exportProfile": "final", "audioMode": "normal", "captions": "off"},
                "outputSuffix": "final",
                "renderCommand": f"npx hyperframes render videos/{pid} --variables-file videos/{pid}/exports/final.variables.json --output videos/{pid}/renders/{pid}-final.mp4 --fps 30 --quality high",
                "artifacts": [{"type": "render", "label": "Final MP4 target", "path": f"videos/{pid}/renders/{pid}-final.mp4"}],
            },
        ],
        "updatedAt": "2026-07-17",
    }


async def main():
    PROJECTS.mkdir(parents=True, exist_ok=True)
    for project in PROJECT_DEFS:
        project_dir = VIDEOS / project["id"]
        project_dir.mkdir(parents=True, exist_ok=True)
        copy_assets(project_dir)
        write_text(project_dir / "DESIGN.md", design_md(project))
        write_text(project_dir / "SCRIPT.md", script_md(project))
        write_text(project_dir / "STORYBOARD.md", storyboard_md(project))
        write_text(project_dir / "PRONUNCIATION.md", "РОСПАН: произносить раздельно и четко. КМ0 и КМ1: ка-эм-ноль, ка-эм-один.\n")
        write_text(project_dir / "index.html", html_for(project))
        captions(project, project_dir)
        await tts(project, project_dir)
        write_text(PROJECTS / f"{project['id']}.json", json.dumps(manifest(project), ensure_ascii=False, indent=2) + "\n")
        print(f"built {project['id']}")


if __name__ == "__main__":
    asyncio.run(main())
