# ReFrameMotion v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working single-node mass video production platform with dashboard, API, queue, render worker, MCP and documentation.

**Architecture:** Node.js built-ins provide the control plane; SQLite WAL is the durable one-host queue; trusted manifest-driven templates are rendered by isolated HyperFrames or Remotion child processes. The system is structured so a later PostgreSQL and Cloud Storage profile can replace persistence without changing the user-facing API.

**Tech Stack:** Node.js 22.16+, node:sqlite, HTML/CSS/JavaScript, HyperFrames 0.7.60, optional Remotion 4.0.490, FFmpeg, Docker Compose.

## Global Constraints

- Never accept arbitrary HTML through HTTP or MCP.
- Never concatenate user input into shell commands.
- Do not commit secrets, outputs or customer datasets.
- Do not claim distributed Cloud Run support with SQLite.
- Every behavior change needs `node:test` coverage.

---

### Task 1: Repository and memory reset

**Files:** `README.md`, `AGENTS.md`, `ROADMAP.md`, `docs/memory/*`, `docs/wiki/*`

- [x] Replace misleading prototype claims with an explicit supported boundary.
- [x] Add dated facts, decisions, backlog and wiki index.
- [x] Add Codex commands and operating constraints.

### Task 2: Durable job store

**Files:** `packages/core/store/schema.sql`, `packages/core/store/sqlite.mjs`, `tests/store.test.mjs`

- [x] Add batches, jobs and append-only events.
- [x] Add atomic batch insert and queue claim transaction.
- [x] Add retry, cancellation and stale-job recovery.
- [x] Verify lifecycle tests.

### Task 3: Template registry and batch parsing

**Files:** `packages/core/templates.mjs`, `packages/core/batch.mjs`, `tests/templates.test.mjs`, `tests/batch.test.mjs`

- [x] Add manifest discovery, typed variables and workspace preparation.
- [x] Deny remote assets by default.
- [x] Add quoted CSV and JSON batch parsing.
- [x] Verify invalid data fails before insertion.

### Task 4: API and dashboard

**Files:** `apps/api/server.mjs`, `apps/dashboard/public/*`, `docs/api/http-api.md`

- [x] Add authenticated CRUD endpoints for templates, jobs, batches and events.
- [x] Add a no-build dashboard for queue and batch control.
- [x] Add request limits and error isolation.

### Task 5: Render worker

**Files:** `apps/worker/worker.mjs`, `packages/core/render/*`, `tests/api-worker.test.mjs`

- [x] Add mock, HyperFrames and Remotion adapters.
- [x] Add bounded child-process timeout and cancellation polling.
- [x] Verify API-to-worker-to-artifact end-to-end behavior.

### Task 6: MCP and Codex

**Files:** `apps/mcp/server.mjs`, `tests/mcp.test.mjs`, `AGENTS.md`

- [x] Add MCP initialize, tools, resources and prompt handlers.
- [x] Route tools through the HTTP API.
- [x] Verify tools list and initialization.

### Task 7: Deployment and validation

**Files:** `compose.yaml`, `Dockerfile`, `.github/workflows/ci.yml`, `scripts/*`, `docs/operations/*`

- [x] Add local init, doctor, syntax and documentation checks.
- [x] Add one-host Docker deployment.
- [x] Document Google Cloud migration boundary.
- [x] Run all checks and fix defects found by verification. See `docs/operations/verification-2026-07-16.md`.
