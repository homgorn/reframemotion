# Google Cloud

Read [`docs/operations/google-cloud.md`](../../docs/operations/google-cloud.md) first.

The current safe deployment is a single Compute Engine VM with a persistent disk and Docker Compose. `cloudbuild.yaml` builds the same image in Cloud Build.

Cloud Run service + Cloud Run Jobs becomes supported only after the PostgreSQL/Cloud SQL and Cloud Storage tasks in Phase 2 are complete.
