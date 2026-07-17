# Production runbook

## Supported topology

One Linux VM or bare-metal host with:

- persistent SSD volume;
- Node.js 22.16+;
- FFmpeg;
- HyperFrames 0.7.60 for HTML/GSAP templates;
- enough RAM for the configured browser concurrency.

Run API and worker as separate processes or Compose services. Keep worker concurrency at `1` until a representative render is profiled.

## Startup

```bash
cp .env.example .env
# Set a 24+ character API key and production mode.
NODE_ENV=production REFRAMOTION_API_KEY='...' docker compose up --build -d
```

## Windows local dashboard

For local operator work on Windows, run:

```bat
start-dashboard.bat
```

The script is idempotent for the default local port. If `http://127.0.0.1:8787/api/health` already responds, it opens the dashboard and exits. Otherwise it installs dependencies when `node_modules/` is missing and starts `node apps/api/server.mjs` in the current console.

## Smoke test

1. `curl http://127.0.0.1:8787/api/health`.
2. Queue `demo-card`.
3. Confirm the worker changes it to `succeeded`.
4. Confirm a JSON artifact exists under `data/outputs/single/`.
5. Run one HyperFrames template.
6. Inspect its MP4 before importing a large batch.

## Backup

Stop API writes or take a consistent SQLite snapshot using its backup mechanism. Back up:

- `data/reframemotion.sqlite`;
- `data/outputs/` when outputs are not replicated elsewhere;
- `templates/` and the Git commit SHA;
- `.env` through a secret manager, not Git.

## Recovery

On startup, the worker requeues jobs left in `running` longer than twice the render timeout or one hour, whichever is greater. Review `events` before manually editing the database.

## Capacity

Each HyperFrames or Remotion render may launch Chromium and FFmpeg. Concurrency is not the same as throughput. Measure CPU, RAM, disk write rate and render duration using real templates before increasing `REFRAMOTION_WORKER_CONCURRENCY`.

## Retention

v1 does not delete outputs automatically. Track free disk space. Phase 1 adds retention policies and quotas.

## Incident priorities

1. Stop new job creation.
2. Preserve SQLite and logs.
3. Stop workers if outputs may be corrupted.
4. Reproduce with `demo-card` and one real template.
5. Restore service, then retry terminal jobs explicitly.
