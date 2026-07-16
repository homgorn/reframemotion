# AGENTS.md — Codex operating guide

## Mission

Maintain ReFrameMotion as a reliable local-first mass video production system. The repository is the source of truth for code, template manifests, operational docs, decisions and the video wiki.

## Required reading order

1. `README.md`
2. `docs/architecture/overview.md`
3. `docs/memory/FACTS.md`
4. `docs/memory/DECISIONS.md`
5. the relevant wiki chapter under `docs/wiki/`
6. the template's `template.json` and `DESIGN.md`

## Commands

```bash
npm ci
npm run init
npm run check
npm run doctor
npm run dev
npm run worker:once
```

Do not report success unless `npm run check` passes. A real video renderer additionally requires `npm run doctor` to show FFmpeg and the selected engine as available.

## Architecture constraints

- Node.js 22.16 or newer.
- GSAP runtime is pinned through npm and copied into isolated HyperFrames workspaces during preparation.
- No arbitrary HTML render endpoint.
- User input may select a registered template and variables only.
- Never concatenate user input into shell commands. Use `spawn(command, args, {shell:false})`.
- `data/`, outputs, media, secrets and `.env` are never committed.
- SQLite is the supported v1 store and assumes one persistent host. Do not claim horizontal Cloud Run support until the Cloud SQL store is implemented and tested.
- HyperFrames is the primary HTML/GSAP renderer. Remotion is optional and template-specific.
- Every template needs `template.json`; multi-scene HyperFrames templates also need a visual identity document.
- Facts in ads must be traceable to `FACTS-AND-LIMITATIONS.md` or another dated source file.

## Development workflow

1. Reproduce or specify the change.
2. Add a failing `node:test` case.
3. Implement the smallest safe change.
4. Run the focused test.
5. Run `npm run check`.
6. Update docs, changelog and memory when behavior changes.

Prefer focused modules. Do not turn `apps/api/server.mjs` or the store into an unrelated utility dump.

## Adding a template

Create `templates/<group>/<id>/template.json`:

```json
{
  "id": "unique-template-id",
  "name": "Human name",
  "engine": "hyperframes",
  "outputFormat": "mp4",
  "allowAdditionalVariables": false,
  "variables": {
    "headline": {
      "type": "string",
      "required": true,
      "maxLength": 120,
      "pattern": "^[^<>]*$"
    }
  },
  "render": {"fps": 30, "quality": "standard"},
  "security": {"allowRemoteAssets": false}
}
```

Use `{{variable}}` placeholders in text files. Keep assets local. Run `npm run doctor`, then queue one test render before creating a large batch.

## Mass generation rules

- One batch represents one campaign or one controlled experiment.
- Change one major hypothesis per variant.
- Validate every row before insertion; batch creation must be atomic.
- Start with 3–5 smoke jobs, inspect outputs, then enqueue the full dataset.
- Keep stable identifiers so a failed batch can be reproduced.
- Do not overwrite successful outputs. New attempts keep the same job ID but events and attempts remain auditable.

## Documentation and memory

- `docs/wiki/` — durable domain knowledge.
- `docs/memory/FACTS.md` — verified current facts and pinned versions.
- `docs/memory/DECISIONS.md` — architecture decisions and reasons.
- `docs/memory/BACKLOG.md` — deferred work, not hidden TODOs in production code.
- `ROADMAP.md` — public delivery sequence.
- `CHANGELOG.md` — shipped changes.

When external APIs or licenses may have changed, update the date and source before changing code or claims.
