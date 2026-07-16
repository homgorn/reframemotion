# ReFrameMotion production rewrite design

Date: 2026-07-16

## Goal

Replace the non-functional prototype with a truthful, testable, Codex-compatible system for mass generation from trusted HyperFrames and Remotion templates.

## Product boundary

v1 is production-capable on one persistent host. It includes dashboard, API, durable queue, worker, template registry, batch import, retries, cancellation, audit events and MCP. It does not claim horizontal cloud scaling, billing or multi-tenancy.

## Architecture

- Node.js 22 control plane with no runtime framework dependencies.
- SQLite WAL for jobs, batches and events.
- Static dashboard served by the API.
- Separate worker process with bounded concurrency.
- Renderer adapters using argument arrays and `shell:false`.
- Trusted template manifests plus typed variables.
- MCP client surface delegates to the HTTP API.

## Security

No arbitrary HTML endpoint. Template paths and output paths remain below configured roots. Production requires a strong bearer key. Remote assets are denied by default. Generated media and secrets are excluded from Git.

## Data model

Batch: id, name, status, total, timestamps.

Job: id, batch, template, engine, format, variables, state, priority, attempts, cancellation flag, worker, output, error and timestamps.

Event: append-only transition record linked to a job or batch.

## Cloud evolution

The store and output interfaces are explicit migration boundaries. Phase 2 adds PostgreSQL/Cloud SQL, Cloud Storage and Cloud Run Jobs; SQLite is never shared between Cloud Run instances.

## Acceptance criteria

- `npm run check` passes from a clean checkout without third-party runtime dependencies.
- API creates a job, worker claims it and mock renderer creates an artifact.
- Invalid variables and invalid batch rows create no partial batch.
- Codex can list MCP tools and read architecture resources.
- README and roadmap do not advertise unimplemented SaaS behavior.
