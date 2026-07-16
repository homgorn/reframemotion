---
name: reframotion
summary: Operate the ReFrameMotion mass-video repository safely through registered templates, batches, QA and reproducible renders.
---

# ReFrameMotion skill

Use this skill for work inside this repository.

## Before changing code or generating video

1. Read `/AGENTS.md`.
2. Read `/docs/memory/FACTS.md` and `/docs/memory/DECISIONS.md`.
3. Read the relevant chapter under `/docs/wiki/`.
4. Inspect the selected template manifest and `DESIGN.md`.
5. Run `npm run check` before and after code changes.

## Generation workflow

1. List templates through MCP or `GET /api/templates`.
2. Create 3–5 smoke jobs using validated variables.
3. Run the worker and inspect actual outputs.
4. Record factual claims and source dates.
5. Only then create the full batch.

Never send arbitrary HTML to the API, create shell commands from variables, commit output media or claim cloud scaling beyond the current architecture boundary.
