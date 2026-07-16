# Architecture overview

## Scope

ReFrameMotion v1 is a production-oriented **single-node** system for mass generation from trusted templates. The API, dashboard and worker may run as separate processes, but they share one SQLite database and one persistent output volume.

## Components

### Dashboard

Static HTML/CSS/JavaScript served by the API. It creates jobs and batches, polls state, exposes retry/cancel controls and displays the site/video project catalog from `projects/`. There is no frontend build step and no runtime dependency on a CDN.

### API

`apps/api/server.mjs` uses the Node.js HTTP server. It validates request size, optional bearer authentication, template IDs and variables. It does not accept arbitrary composition HTML.

### Store

`packages/core/store/sqlite.mjs` uses Node 22 `node:sqlite`, WAL mode and `BEGIN IMMEDIATE` transactions. Batch insertion is atomic. Workers claim one queued row at a time ordered by priority and creation time.

### Worker

`apps/worker/worker.mjs` claims jobs, prepares an isolated workspace, invokes a renderer without a shell, checks cancellation and records success or failure. Retries are bounded by `maxAttempts`.

### Template registry

Every template has a `template.json` manifest. The registry validates IDs, engines and typed variables, copies only the registered directory and rejects remote assets unless the template explicitly opts in.

### Project catalog

`projects/` stores lightweight Git manifests for sites and video projects. A site directory contains `site.json` and optional `videos/*.json` manifests. The catalog is not the render queue and does not store MP4/WAV. It links business context, project status, preview URLs, checks and artifacts to jobs/batches and templates.

### Render adapters

- HyperFrames: lint → check → render.
- Remotion: CLI render for a registered Remotion project and composition ID.
- Mock: writes a JSON artifact for integration tests.

### MCP

`apps/mcp/server.mjs` exposes tools for templates, jobs and batches plus documentation resources. It calls the HTTP API, so Codex receives the same validation and authorization behavior as the dashboard.

## Data flow

```text
campaign rows
    │
    ▼
validation + template defaults
    │ atomic insert
    ▼
SQLite jobs/batches/events
    │ claim
    ▼
workspace copy + substitution
    │
    ▼
renderer process
    │
    ├─ success → output path + event
    └─ failure → retry or terminal failure
```

Site and video discovery flows separately:

```text
projects/<site>/site.json
projects/<site>/videos/*.json
    │
    ▼
ProjectCatalog
    │
    ▼
GET /api/catalog → dashboard project registry
```

## Security boundaries

The repository treats templates as code and variables as data. A trusted maintainer may add a template; an API caller may only select it and supply values. Commands are invoked with argument arrays and `shell:false`. Paths are resolved under configured roots.

## Scaling boundary

SQLite is suitable for one host with several worker loops. It is not a shared distributed queue for Cloud Run. Phase 2 replaces the store and output layer while retaining the API, template and renderer interfaces.
