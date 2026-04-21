# HyperFrames Platform — Fork Plan

> Based on heygen-com/hyperframes (Apache 2.0) | 2026-04-21

---

## Goal

Build **HyperFrames Platform** — SaaS video rendering platform with:
- REST API for programmatic rendering
- MCP Server for AI agents
- Background Workers for scalable rendering
- Browser Pool for parallel processing

## Strategy

**DO:**
- Use original packages as-is (core, engine, producer, cli, studio)
- Add new packages separately (api, worker, mcp)
- Call hyperframes CLI via execa

**DON'T:**
- Modify original packages
- Merge with main — keep independent

## New Packages

| Package | Purpose | Tech |
|---------|---------|------|
| `@hyperframes/api` | REST API server | Hono + JWT |
| `@hyperframes/worker` | Render worker | BullMQ + Redis |
| `@hyperframes/mcp` | MCP server | @modelcontextprotocol/sdk |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client   │────▶│    API    │────▶│  Worker   │
│  (JSON)   │     │  (Hono)  │     │ (BullMQ)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                           │
                    ┌─────────────┐          ▼
                    │    MCP     │◀────┌─────────────┐
                    │  (stdio)  │     │   Redis   │
                    └─────────────┘     └─────────────┘
```

## Upstream Sync

```bash
git fetch upstream
git log upstream/main --not origin/main --oneline  # check new commits
```

## Next Steps

- [x] Create packages/api
- [x] Create packages/worker
- [x] Create packages/mcp
- [ ] Add docker-compose.platform.yml
- [ ] Add documentation
- [ ] Test individual packages
- [ ] Push to fork

---

**Status:** v0.1.0 — Foundation created