# OpenKitchenPlanner (OKP)

OpenKitchenPlanner is a web-based planning platform for carpentry workshops and kitchen studios. It combines room modeling, catalog- and CAD-based workflows, pricing and quote generation, and export pipelines in one monorepo.

## Release status

- **Current channel:** `v0.1.0-rc1`
- **Date:** `2026-03-04`
- **Stabilization focus:** Sprint 98 (core-path hardening, tenant-scope checks, regression cleanup)
- **Verification snapshot:** full build green, full test suite green, security smoke tests green

## Core capabilities

- Polygonal rooms with wall-based modeling and constraints
- Openings, placements, levels, layout sheets, and viewer exports
- BOM/pricing/quotes including PDF export
- Survey import flows (including EGI parsing/mapping)
- CAD interop (DXF import/export) and SketchUp import
- Tenant-aware API routes and scoped settings/configuration

## Tech stack

| Layer        | Technology                                       |
|--------------|--------------------------------------------------|
| Frontend     | React + TypeScript + Vite + Konva.js / Three.js |
| Backend      | Node.js + Fastify + TypeScript                   |
| Database     | PostgreSQL via Prisma ORM                        |
| Validation   | Zod + shared-schemas                             |
| CAD interop  | dxf-parser / dxf-writer                          |
| Testing      | Vitest                                           |

## Monorepo structure

```
open-kitchen-planner/
├── planner-frontend/      # React app
├── planner-api/           # Fastify REST API
├── shared-schemas/        # Shared domain types & validation
├── interop-cad/           # DXF import & export
├── interop-sketchup/      # SKP import
└── Docs/                  # Architecture, status, sprint docs
```

## Prerequisites

- Node.js `20+` (`22.x` recommended)
- npm `10+`
- Docker Desktop (optional, recommended for database + API runtime)

## Setup option A (recommended): Docker for API + DB

Run from repository root:

```bash
# Build and start PostgreSQL + API
docker-compose up -d --build postgres api

# Apply Prisma schema
docker-compose exec api npm run db:push

# View API logs
docker-compose logs -f api
```

Services:

- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432` (`yakds` / `yakds_dev`, DB `yakds`)

Frontend is started locally (not part of `docker-compose.yml`):

```bash
npm run dev --workspace planner-frontend
```

Stop/reset:

```bash
docker-compose down
docker-compose down -v
```

## Setup option B: local Node.js + local PostgreSQL

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

Create `planner-api/.env` with at least:

```dotenv
DATABASE_URL=postgresql://yakds:yakds_dev@localhost:5432/yakds
FRONTEND_URL=http://localhost:5173
PORT=3000
HOST=0.0.0.0
```

Then initialize DB and start apps:

```bash
npm run db:push --workspace planner-api
npm run dev --workspace planner-api
npm run dev --workspace planner-frontend
```

## Build & verification

```bash
# Build
npm run build --workspace planner-frontend
npm run build --workspace planner-api

# Full monorepo tests
npm test
```

Security-focused smoke suite:

```bash
npm run test --workspace planner-api -- src/routes/quotes.test.ts src/routes/tenantSettings.test.ts src/routes/projectEnvironment.test.ts src/routes/levels.test.ts src/routes/viewerExports.test.ts src/routes/surveyImport.test.ts src/routes/projects.test.ts
```

Known non-blocking note: Vite may show chunk-size warnings in production build output.

## Documentation

- [Architecture](Docs/ARCHITECTURE.md)
- [Domain models](Docs/DOMAIN_MODELS.md) – room model, pricing logic, quote system
- [Interop](Docs/INTEROP.md) – DXF/DWG, SketchUp, render worker protocol
- [Styling guide](Docs/STYLING_GUIDE_OKP.md) – tokens, component patterns, rollout
- [Roadmap](Docs/ROADMAP.md)
- [Status](Docs/STATUS.md)
- [Sprint 98 stabilization](Docs/AGENT_SPRINTS/S98-stabilisierungsphase.md)
- [Sprint 98 golden paths checklist](Docs/S98_GOLDENE_PFADE_CHECKLISTE.md)

## Contributing

Contributions are welcome – please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

Please report security vulnerabilities confidentially – see [SECURITY.md](SECURITY.md).

## License

Copyright 2026 Tischlermeister Daniel Klas
Licensed under the [Apache License 2.0](LICENSE).
