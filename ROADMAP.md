# ReFrameMotion roadmap

Status date: **2026-07-16**.

## Shipped — v1.0 single-node production foundation

- [x] Full repository rewrite.
- [x] Registered templates and variable validation.
- [x] REST API and dashboard.
- [x] SQLite WAL queue with atomic batch creation.
- [x] Worker claim, retry, cancellation and stale-job recovery.
- [x] HyperFrames, Remotion and mock adapters.
- [x] JSON/CSV batch import.
- [x] MCP tools/resources/prompts for Codex.
- [x] Docker Compose, CI, runbook and security policy.
- [x] Video Creation Wiki and five Rospan ad templates.

## Phase 1 — harden one-node production

- [ ] Add per-job structured render logs available through API and dashboard.
- [ ] Add disk quota checks and automatic retention policies.
- [ ] Add signed output download routes instead of exposing filesystem paths.
- [ ] Add webhook callbacks with HMAC signatures.
- [ ] Add browser screenshots and automated visual regression for hero frames.
- [ ] Add asset malware scanning and MIME verification.
- [ ] Add release workflow with container signing and SBOM.

Exit criterion: 1,000-job batch completes on one VM with recoverable failures and no manual DB edits.

## Phase 2 — Google Cloud distributed profile

- [ ] Implement PostgreSQL/Cloud SQL `JobStore` with `FOR UPDATE SKIP LOCKED`.
- [ ] Store templates and outputs in Google Cloud Storage.
- [ ] Dispatch one job or task range through Cloud Run Jobs.
- [ ] Use Workload Identity; remove static service-account keys.
- [ ] Add idempotency keys for API and Cloud Run retries.
- [ ] Add Cloud Logging traces, metrics and alerts.
- [ ] Add Terraform for Cloud Run, Cloud SQL, GCS, Artifact Registry and IAM.

Exit criterion: multiple workers can process the same queue without duplicate successful outputs.

## Phase 3 — campaign operations

- [ ] Visual template and variable editor.
- [ ] CSV field mapping UI.
- [ ] Approval states: draft → reviewed → approved → rendering → published.
- [ ] A/B hypothesis metadata and analytics import.
- [ ] Brand kits, reusable assets and locked claims.
- [ ] WordPress/WooCommerce and ad-platform exporters.

## Phase 4 — multi-tenant SaaS

- [ ] Organizations, users and role-based access.
- [ ] Quotas, billing, usage metering and cost estimates.
- [ ] Tenant-isolated object paths and encryption keys.
- [ ] Remote MCP with OAuth and audit logs.
- [ ] Regional deployment and data retention controls.

## Explicitly deferred

- Training a custom video model.
- Arbitrary user-supplied HTML execution.
- A general-purpose nonlinear video editor.
- Claiming Remotion Cloud Run as the default scaling path while its official Cloud Run package remains non-primary compared with supported server-side and AWS workflows.
