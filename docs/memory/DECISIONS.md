# Architecture decisions

## ADR-001 — Replace the old prototype

Date: 2026-07-16. Status: accepted.

The previous repository advertised a production API while routes, queue processing, auth and MCP actions were largely stubs. v1 replaces the tree while preserving history in a backup branch.

## ADR-002 — Template IDs, not arbitrary HTML

Date: 2026-07-16. Status: accepted.

Accepting arbitrary browser code through an API creates code-execution, SSRF and cost risks. v1 accepts only trusted registered templates and validated variables.

## ADR-003 — Zero-dependency control plane

Date: 2026-07-16. Status: accepted.

The API, dashboard, worker, SQLite store and MCP framing use Node.js built-ins. GSAP 3.14.2 is the only pinned npm runtime asset and is copied into isolated HyperFrames workspaces. Render engines remain external tools.

## ADR-004 — SQLite for v1

Date: 2026-07-16. Status: accepted with boundary.

SQLite WAL provides atomic batches and recoverable jobs on one persistent host. It is not presented as horizontal Cloud Run infrastructure. PostgreSQL/Cloud SQL is Phase 2.

## ADR-005 — HyperFrames primary, Remotion optional

Date: 2026-07-16. Status: accepted.

HyperFrames is primary for deterministic HTML/GSAP and website-derived motion. Remotion remains available for React compositions, Player-oriented products and existing Remotion projects.

## ADR-006 — Git catalog for sites and video projects

Date: 2026-07-16. Status: accepted.

Large-scale production needs a durable registry above individual render jobs. `projects/` stores lightweight site and video manifests in Git, while MP4/WAV outputs remain outside source control. The dashboard reads this catalog through `/api/catalog` and uses the existing queue for rendering.
