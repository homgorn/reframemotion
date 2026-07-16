# Verification report — 2026-07-16

Commit target: ReFrameMotion v1 production rewrite.

## Verified locally

### Clean dependency install

```text
npm ci --ignore-scripts
added 1 package
found 0 vulnerabilities
```

The only npm runtime dependency is pinned `gsap@3.14.2`.

### Full repository check

```text
npm run check
Syntax checked: 32 files
11 tests passed, 0 failed
Documentation links checked: 39 files
Generated memory and template indexes are current
```

The tests include API → SQLite → worker → artifact, atomic store lifecycle, retries, CSV/JSON imports, MCP initialization, variable validation, remote-asset rejection, pinned GSAP workspace injection and shared template sources.

### HyperFrames templates

Prepared all five Rospan variants through the actual `TemplateRegistry`, then ran HyperFrames `0.7.60` lint on each:

```text
rospan-decors: 0 errors, 0 warnings
rospan-durability: 0 errors, 0 warnings
rospan-fast-install: 0 errors, 0 warnings
rospan-fire-safety: 0 errors, 0 warnings
rospan-free-samples: 0 errors, 0 warnings
```

## Verified remotely

- GitHub `main` points to the production rewrite commit.
- Key files were read back through the GitHub API, including `package.json`, the Rospan manifest and template preparation code.
- The previous clean repository state is preserved in `archive/legacy-2026-07-16`.

## Not verified in this environment

- Docker image build: Docker CLI/daemon is not available in the execution environment. GitHub Actions is configured to run the build.
- Full HyperFrames browser `check` and final MP4 render: Chromium localhost navigation is blocked by the execution environment administrator. Static lint passed; a real workstation/VM must run `npm run doctor`, one smoke render and visual inspection.
- Remotion render: the adapter is implemented, but no Remotion template/project is included in v1 and Remotion is intentionally optional.
- Distributed Google Cloud operation: explicitly not implemented in v1; Cloud SQL, GCS and Cloud Run Jobs are roadmap work.

## Required first production smoke test

On the target machine:

```bash
npm ci
npm run init
npm run check
npm run doctor
npm run dev
```

Then render `demo-card`, one Rospan template, inspect the artifact, and only after that enqueue the five-row example batch.
