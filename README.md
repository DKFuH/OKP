# OpenKitchenPlanner (OKP)

OpenKitchenPlanner is a web-based planning platform for carpentry workshops and kitchen studios.
OpenKitchenPlanner ist eine webbasierte Planungsplattform für Schreinereien und Küchenstudios.

It combines room modeling, catalog and CAD workflows, pricing, quote generation, and export pipelines in one monorepo.
Es vereint Raumplanung, Katalog- und CAD-Workflows, Kalkulation, Angebotserstellung und Export-Pipelines in einem Monorepo.

## Release status / Release-Status

- **Current channel / Aktueller Kanal:** `v0.1.0-rc1`
- **Date / Datum:** `2026-03-04`
- **Stabilization focus / Stabilisierungsschwerpunkt:** Sprint 98 (core-path hardening, tenant-scope checks, regression cleanup)
- **Verification snapshot / Verifizierungsstand:** full build green, full test suite green, security smoke tests green

## Core capabilities / Kernfunktionen

- Polygonal rooms with wall-based modeling and constraints / Polygonale Räume mit wandbasierter Modellierung und Constraints
- Openings, placements, levels, layout sheets, and viewer exports / Öffnungen, Platzierungen, Ebenen, Layout-Blätter und Viewer-Exporte
- BOM/pricing/quotes including PDF export / Stücklisten, Kalkulation und Angebote inkl. PDF-Export
- Survey import flows (including EGI parsing/mapping) / Aufmaß-Import-Flows (inkl. EGI-Parsing/Mapping)
- CAD interop (DXF import/export) and SketchUp import / CAD-Interop (DXF Import/Export) und SketchUp-Import
- Tenant-aware API routes and scoped settings/configuration / Mandantenfähige API-Routen und bereichsbezogene Einstellungen

## Tech stack / Tech-Stack

- Frontend: React + TypeScript + Vite + Konva.js / Three.js
- Backend: Node.js + Fastify + TypeScript
- Database / Datenbank: PostgreSQL via Prisma ORM
- Validation / Validierung: Zod + shared-schemas
- CAD interop / CAD-Interop: dxf-parser / dxf-writer
- Testing / Tests: Vitest

## Monorepo structure / Monorepo-Struktur

```text
open-kitchen-planner/
├── planner-frontend/      # React app
├── planner-api/           # Fastify REST API
├── shared-schemas/        # Shared domain types & validation
├── interop-cad/           # DXF import & export
├── interop-sketchup/      # SKP import
└── Docs/                  # Architecture, status, sprint docs
```

## Prerequisites / Voraussetzungen

- Node.js `20+` (`22.x` recommended)
- npm `10+`
- Docker Desktop (optional, recommended for database + API runtime)

Hinweis: Alle folgenden Befehle werden aus dem Repository-Root ausgeführt, sofern nicht anders angegeben.

## Setup option A (recommended): Docker for API + DB / Setup Option A (empfohlen): Docker für API + DB

Run from repository root:
Ausführen im Repository-Root:

```bash
# Build and start PostgreSQL + API
docker-compose up -d --build postgres api

# Apply Prisma schema
docker-compose exec api npm run db:push

# View API logs
docker-compose logs -f api
```

Services:
Dienste:

- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432` (`okp` / `okp_dev`, DB `okp`)

Frontend is started locally (not part of `docker-compose.yml`):
Frontend wird lokal gestartet (nicht Teil von `docker-compose.yml`):

```bash
npm run dev --workspace planner-frontend
```

Stop/reset:
Stoppen/Zurücksetzen:

```bash
docker-compose down
docker-compose down -v
```

## Container release (OKP) / Container-Release (OKP)

The API container is published to GHCR by `.github/workflows/docker-api.yml`.
Der API-Container wird über `.github/workflows/docker-api.yml` nach GHCR veröffentlicht.

Image:
Image:

```bash
ghcr.io/<github-owner>/okp-planner-api
```

### Kurzfassung (DE)

- Nutzer ziehen das API-Image mit `docker pull ghcr.io/<github-owner>/okp-planner-api:latest`.
- Start erfolgt mit `docker run` und gesetzter `DATABASE_URL` auf eine erreichbare PostgreSQL-Instanz.
- Maintainer veröffentlichen nicht manuell: Push auf `main` oder Release-Tag `v*` startet den Publish-Workflow.
- Für private GHCR-Pakete ist vorher `docker login ghcr.io` erforderlich.

### For users: pull and run / Für Nutzer: ziehen und starten

Pull latest stable image from `main`:
Aktuelles stabiles Image von `main` ziehen:

```bash
docker pull ghcr.io/<github-owner>/okp-planner-api:latest
```

Run API container (expects reachable PostgreSQL):
API-Container starten (erwartet erreichbare PostgreSQL-Instanz):

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://okp:okp_dev@<db-host>:5432/okp \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e FRONTEND_URL=http://localhost:5173 \
  ghcr.io/<github-owner>/okp-planner-api:latest
```

If the package is private, login first:
Falls das Package privat ist, zuerst anmelden:

```bash
docker login ghcr.io
```

### For maintainers: build and publish / Für Maintainer: bauen und veröffentlichen

Local production image build test:
Lokalen Production-Build testen:

```bash
docker build -f planner-api/Dockerfile -t okp-planner-api:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://okp:okp_dev@host.docker.internal:5432/okp \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e FRONTEND_URL=http://localhost:5173 \
  okp-planner-api:local
```

Publish is automatic when one of these happens:
Die Veröffentlichung startet automatisch bei einem der folgenden Ereignisse:

- Push to `main` affecting API/shared Docker-relevant paths
- Push a git tag matching `v*` (example: `v0.1.0`)
- Manual trigger via `workflow_dispatch`

Tag strategy:

- `latest` for default branch builds
- `v*` for release tags
- `sha-<short-commit>` for immutable commit snapshots

Example release tag flow:
Beispiel für einen Release-Tag-Flow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Setup option B: local Node.js + local PostgreSQL / Setup Option B: lokales Node.js + lokales PostgreSQL

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate
```

Create `planner-api/.env` with at least:
Lege `planner-api/.env` mindestens mit folgenden Werten an:

```dotenv
DATABASE_URL=postgresql://okp:okp_dev@localhost:5432/okp
FRONTEND_URL=http://localhost:5173
PORT=3000
HOST=0.0.0.0
```

Then initialize DB and start apps:
Danach Datenbank initialisieren und Apps starten:

```bash
npm run db:push --workspace planner-api
npm run dev --workspace planner-api
npm run dev --workspace planner-frontend
```

## Build & verification / Build & Verifikation

```bash
# Build
npm run build --workspace planner-frontend
npm run build --workspace planner-api

# Full monorepo tests
npm test
```

Security-focused smoke suite:
Sicherheitsfokussierte Smoke-Suite:

```bash
npm run test --workspace planner-api -- src/routes/quotes.test.ts src/routes/tenantSettings.test.ts src/routes/projectEnvironment.test.ts src/routes/levels.test.ts src/routes/viewerExports.test.ts src/routes/surveyImport.test.ts src/routes/projects.test.ts
```

Known non-blocking note: Vite may show chunk-size warnings in production build output.
Bekannter nicht-blockierender Hinweis: Vite kann Warnungen zur Chunk-Größe im Production-Build ausgeben.

## Documentation / Dokumentation

- [Architecture](Docs/ARCHITECTURE.md) – architecture overview / Architekturüberblick
- [Domain models](Docs/DOMAIN_MODELS.md) – room model, pricing logic, quote system / Raummodell, Kalkulationslogik, Angebotssystem
- [Interop](Docs/INTEROP.md) – DXF/DWG, SketchUp, render worker protocol / DXF/DWG, SketchUp, Render-Worker-Protokoll
- [Styling guide](Docs/STYLING_GUIDE_OKP.md) – tokens, component patterns, rollout / Tokens, Komponentenmuster, Rollout
- [Roadmap](Docs/ROADMAP.md) – feature and milestone planning / Feature- und Meilensteinplanung
- [Status](Docs/STATUS.md) – current delivery status / aktueller Lieferstatus
- [Sprint 98 stabilization](Docs/AGENT_SPRINTS/S98-stabilisierungsphase.md) – stabilization workstream / Stabilisierungs-Workstream
- [Sprint 98 golden paths checklist](Docs/S98_GOLDENE_PFADE_CHECKLISTE.md) – acceptance checklist / Abnahme-Checkliste

## Contributing / Mitwirken

Contributions are welcome – please read [CONTRIBUTING.md](CONTRIBUTING.md) first.
Beiträge sind willkommen – bitte zuerst [CONTRIBUTING.md](CONTRIBUTING.md) lesen.

## Code of conduct / Verhaltenskodex

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
Dieses Projekt folgt dem [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security / Sicherheit

Please report security vulnerabilities confidentially – see [SECURITY.md](SECURITY.md).
Bitte Sicherheitslücken vertraulich melden – siehe [SECURITY.md](SECURITY.md).

## License / Lizenz

Copyright 2026 Tischlermeister Daniel Klas
Licensed under the [Apache License 2.0](LICENSE).
