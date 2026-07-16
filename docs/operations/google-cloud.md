# Google Cloud deployment notes

## Current supported recommendation

For v1, deploy Docker Compose to a Compute Engine VM with a persistent disk. This preserves SQLite's single-host assumptions and is the least misleading production option.

Do **not** run multiple Cloud Run service instances against SQLite. Cloud Run filesystems are instance-local and SQLite is not a distributed queue.

## Planned distributed profile

The stable target architecture is:

- dashboard/API: Cloud Run service;
- job store: Cloud SQL for PostgreSQL;
- templates and outputs: Cloud Storage;
- render execution: Cloud Run Jobs;
- images: Artifact Registry;
- secrets: Secret Manager;
- identity: Workload Identity/IAM, no downloaded service-account keys.

`packages/core/gcp/cloud-run.mjs` contains a small REST dispatcher for the Cloud Run Jobs `:run` operation. It is not wired into production until the shared PostgreSQL store and object storage layer land.

## Build image

```bash
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions=_IMAGE=REGION-docker.pkg.dev/PROJECT/reframemotion/app:1.0.0
```

## VM deployment

1. Create a Debian/Ubuntu VM with Docker and a persistent disk.
2. Clone the repository at a pinned commit.
3. Store `REFRAMOTION_API_KEY` outside Git.
4. Run `docker compose up --build -d`.
5. Put the API behind HTTPS and restrict firewall access.
6. Snapshot the disk and SQLite database regularly.
