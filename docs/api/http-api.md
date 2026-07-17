# HTTP API

Base URL: `http://127.0.0.1:8787` by default.

When `REFRAMOTION_API_KEY` is set, all `/api/*` routes except `/api/health` require:

```http
Authorization: Bearer <key>
```

## Health

`GET /api/health`

Returns version, time and aggregate job/batch counts.

## Templates

- `GET /api/templates`
- `POST /api/templates/reload`

Template responses omit absolute server paths.

## Project catalog

- `GET /api/catalog`
- `GET /api/sites`
- `GET /api/projects`
- `GET /api/projects?siteId=rospan.ru`

The project catalog is loaded from `projects/`. It is a lightweight Git registry for sites, video projects, validation status, preview URLs and artifact pointers. It does not enqueue jobs and does not store render outputs.

## Project export profiles

`POST /api/projects/:siteId/:projectId/exports`

Request:

```json
{"profileId": "demo_watermark"}
```

Response status is `202 Accepted`. The response is an export plan, not a running job:

```json
{
  "exportRequest": {
    "status": "planned",
    "profileId": "demo_watermark",
    "watermark": true,
    "audioMode": "normal",
    "captions": "on",
    "variablesPath": "exports/demo-watermark.variables.json",
    "renderCommand": "npx hyperframes render ... --variables-file ...",
    "approvalRequired": false
  }
}
```

Use these profiles for client workflow buttons:

- `demo_watermark` — preview with a large DEMO watermark.
- `final_master` — clean export after approval.
- `silent_text` — muted export plus separate `.vtt`, `.srt` and text sidecars.
- `captions_on` — clean video with burned-in subtitles enabled.
- audio profiles may point to `ffmpeg` commands for soundtrack review or final audio masters.

## Jobs

### Create

`POST /api/jobs`

```json
{
  "templateId": "demo-card",
  "variables": {"headline": "Hello"},
  "engine": "mock",
  "outputFormat": "json",
  "priority": 0,
  "maxAttempts": 2
}
```

`engine` and `outputFormat` may be omitted to use manifest defaults.

### Read and list

- `GET /api/jobs?status=queued&limit=100&offset=0`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/cancel`
- `POST /api/jobs/:id/retry`

Only failed or cancelled jobs can be retried manually.

## Batches

- `GET /api/batches`
- `GET /api/batches/:id`
- `POST /api/batches`
- `POST /api/batches/import`

Import request:

```json
{
  "name": "Campaign",
  "format": "csv",
  "content": "template_id,variables_json\ndemo-card,\"{\"\"headline\"\":\"\"A\"\"}\""
}
```

The batch is fully validated before the transaction begins. Invalid rows do not create partial jobs.

## Events

`GET /api/events?after=0&limit=200`

Events are append-only audit records for job and batch transitions.

## Limits

Defaults:

- body: 5 MiB;
- one batch: 10,000 jobs;
- list page: 500 jobs maximum;
- error stored per job: 8,000 characters.
