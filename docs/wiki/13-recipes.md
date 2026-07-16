# 13. Рабочие рецепты

## HyperFrames: новый проект

```bash
npx hyperframes init product-video --example product-promo
cd product-video
npx hyperframes doctor
npx hyperframes lint
npx hyperframes check
npx hyperframes inspect
npx hyperframes preview
```

## HyperFrames: website-to-video

```bash
npx hyperframes capture https://example.com -o product-video/capture
```

Затем заполнить DESIGN/SCRIPT/STORYBOARD и только после этого compositions.

## HyperFrames: batch personalization

`rows.json`:

```json
[
  {"slug":"alice", "name":"Alice", "metric":"+37%"},
  {"slug":"bob", "name":"Bob", "metric":"+12%"}
]
```

```bash
npx hyperframes render \
  --batch rows.json \
  --batch-concurrency 2 \
  --strict-variables \
  --output 'renders/{slug}.mp4'
```

## HyperFrames: deterministic final

```bash
npx hyperframes render \
  --docker \
  --quality high \
  --fps 30 \
  --output renders/final.mp4
```

## Remotion: новый проект

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npx remotion studio
```

## Remotion: representative still

```bash
npx remotion still Main out/frame-90.png --frame=90 --scale=0.5
```

## Remotion: render

```bash
npx remotion render Main out/final.mp4 --props='{"title":"Демо"}'
```

## Remotion: SSR skeleton

```ts
const serveUrl = await bundle({entryPoint});
const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  inputProps,
});
await renderMedia({
  serveUrl,
  composition,
  inputProps,
  codec: 'h264',
  outputLocation,
  onProgress: ({progress}) => report(progress),
});
```

## FFmpeg: probe

```bash
ffprobe -v error -show_format -show_streams -of json input.mp4 > probe.json
```

## FFmpeg: normalize dimensions/fps

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k normalized.mp4
```

## FFmpeg: loudness analysis

```bash
ffmpeg -i narration.wav -af loudnorm=I=-16:LRA=11:TP=-1.5:print_format=json -f null -
```

## Проверка двух рендеров

```bash
ffmpeg -i a.mp4 -i b.mp4 \
  -lavfi "[0:v][1:v]ssim=stats_file=ssim.log;[0:v][1:v]psnr=stats_file=psnr.log" \
  -f null -
```

## Project manifest

```bash
sha256sum assets/* > assets.sha256
node --version > environment.txt
ffmpeg -version >> environment.txt
```

## Git layout

```text
video-project/
├── README.md
├── DESIGN.md
├── SCRIPT.md
├── STORYBOARD.md
├── assets/
├── src/ or compositions/
├── fixtures/
├── snapshots/
├── renders/
├── manifests/
├── schemas/
└── tests/
```
