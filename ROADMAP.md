# HyperFrames Platform — Roadmap

---

## v0.1.0 — Foundation (DONE)

- [x] packages/api — basic REST endpoints
- [x] packages/worker — BullMQ setup
- [x] packages/mcp — 6 tools

## v0.2.0 — MVP

- [ ] API: JWT authentication
- [ ] API: POST /render endpoint
- [ ] API: GET /jobs/:id status
- [ ] API: PostgreSQL + Drizzle ORM
- [ ] Worker: Connect to hyperframes CLI
- [ ] Docker: Full stack compose

## v0.3.0 — Production

- [ ] Rate limiting
- [ ] S3/MinIO for assets
- [ ] Webhook on job complete
- [ ] Bulk rendering
- [ ] Browser pool configuration
- [ ] Health checks

## v1.0.0 — Launch

- [ ] Authentication (Google, GitHub OAuth)
- [ ] Pricing tiers
- [ ] Usage analytics
- [ ] Multi-region support
- [ ] Monitoring + alerts

---

## Tech Stack

- Node.js 22+
- Bun (monorepo)
- Hono (API)
- BullMQ (workers)
- Drizzle ORM (DB)
- Redis (queue)
- PostgreSQL (data)
- S3/MinIO (storage)

**License:** Apache 2.0