# ARCHITECTURE.md

## Webbasierter Küchenplaner - Systemarchitektur

**Tech-Stack:** Node.js + TypeScript  
**Stand:** Sprint 0 (laufend gepflegt bis Phase 2)

---

## Systemübersicht

```text
┌─────────────────────────────────────────────────────────────────┐
│ Browser (Client)                                               │
│ planner-frontend (React)                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + JSON
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│ planner-api                                                    │
│ (Node.js + Fastify + TypeScript)                               │
│                                                                │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│ │ Geometrie-  │  │ Preis-/BOM-  │  │ Angebots-           │    │
│ │ Service     │  │ Service      │  │ Service             │    │
│ └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘    │
│        │                 │                     │               │
│ ┌──────▼─────────────────▼─────────────────────▼─────────────┐ │
│ │ Datenbank-Layer                                           │ │
│ │ (Postgres via Prisma ORM)                                 │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────┐   ┌──────────────────────────────────┐  │
│ │ Import-Service     │   │ Render-Job-Queue                │  │
│ │ (CAD / SKP)        │   │ (Bull / In-Memory MVP)          │  │
│ └────────┬───────────┘   └────────────────┬─────────────────┘  │
└──────────┼────────────────────────────────┼─────────────────────┘
           │                                │ HTTPS (Pull)
           │ Filesystem / Object Storage    │
┌──────────▼──────────┐          ┌──────────▼─────────────────┐
│ interop-cad         │          │ render-worker             │
│ interop-sketchup    │          │ (Node.js + TypeScript)    │
│ (Parser/Exporter)   │          │ extern, registriert sich  │
└─────────────────────┘          └────────────────────────────┘
```

---

## Pakete

### `planner-frontend`

- **Framework:** React + TypeScript + Vite
- **Canvas:** Konva.js (2D-Editor) / Three.js (3D-Preview)
- **State:** Zustand oder React Query
- **Kommunikation:** REST-Calls gegen `planner-api`

### `planner-api`

- **Framework:** Fastify + TypeScript
- **ORM:** Prisma (Postgres)
- **Validierung:** Zod
- **Jobs:** Bull (Redis-backed Queue) oder In-Memory für MVP
- **Dateiupload:** Multipart via `@fastify/multipart`

### `render-worker`

- **Laufzeit:** Node.js + TypeScript (standalone Prozess)
- **Kommunikation:** HTTPS-Pull vom `planner-api`
- **Rendering:** Blender CLI oder Three.js SSR (Phase 2)

### `shared-schemas`

- TypeScript-Typen und Zod-Schemas für alle Kernobjekte
- Enthält pure Funktionen für Geometrie, Validierung, BOM/Preislogik
- Wird von `planner-api`, `planner-frontend`, `render-worker` geteilt

### `interop-cad`

- DXF/DWG Import und Export
- Bibliothek: `dxf-parser` (Import) + `dxf-writer` (Export); DWG via ODA/LibreDWG (Phase 2)
- Output: neutrales `ImportAsset`-Format

### `interop-sketchup`

- SKP Import als Referenzmodell
- Bibliothek: `sketchup-parser` oder Ruby-Bridge (TBD)
- Output: `SkpReferenceModel` inkl. Komponenten und GLTF-Preview

---

## Schichtenmodell (planner-api)

```text
HTTP-Request
    │
    ▼
Router (Fastify Routes)
    │
    ▼
Controller (Request/Response-Mapping, Zod-Validierung)
    │
    ▼
Service (Geschäftslogik, Domänenregeln)
    │
    ▼
Repository (Prisma-Queries)
    │
    ▼
Postgres
```

**Regel:** Algorithmen (Polygon-Math, Kollision, Height-Checks, BOM/Preisregeln) werden als pure Funktionen in `shared-schemas` oder separaten Util-Modulen gehalten - kein Framework-Code.

---

## Datenbank

- **System:** PostgreSQL 15+
- **ORM:** Prisma
- **Migrationen:** Prisma Migrate
- **Schema-Datei:** `planner-api/prisma/schema.prisma`

### Kern-Tabellen (Sprint 0 Übersicht)

| Tabelle | Beschreibung |
|---|---|
| `users` | Benutzer (light) |
| `projects` | Planungsprojekte |
| `project_versions` | Versionierung |
| `rooms` | Räume mit Polygon-Geometrie |
| `wall_segments` | Wandsegmente eines Raums |
| `openings` | Türen/Fenster an Wänden |
| `ceiling_constraints` | Dachschrägen / Height Constraints |
| `catalog_items` | Möbel-/Gerätekatalog (MVP) |
| `placements` | Platzierte Objekte im Raum |
| `price_lists` | Preislisten |
| `tax_groups` | MwSt-Gruppen |
| `quotes` | Angebote |
| `quote_items` | Angebotspositionen |
| `render_jobs` | Render-Aufträge |
| `import_jobs` | CAD-/SKP-Importjobs |

### Katalog-Tabellen (Phase 2)

Ab Sprint 20 wird das Katalogmodell erweitert:

| Tabelle | Beschreibung |
|---|---|
| `manufacturers` | Hersteller |
| `catalog_articles` | Artikelstämme je Hersteller |
| `article_options` | Konfigurationsoptionen (Breite/Höhe/Front...) |
| `article_variants` | konkrete Varianten (Optionen-Kombinationen) |
| `article_prices` | Preise je Variante/Liste |
| `article_rules` | Regelwerk für Automatismen/Kompatibilität |

`catalog_items` bleibt als MVP-Pfad erhalten, wird aber schrittweise durch das Herstellerkatalogmodell ersetzt.

---

## API-Grundprinzipien

- **Protokoll:** REST + JSON über HTTPS
- **Versionierung:** `/api/v1/...`
- **Authentifizierung:** JWT (Bearer Token) - MVP: einfaches Login
- **Fehlerformat:**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "wall_id must reference an existing wall",
  "details": {}
}
```

- **Erfolg:** HTTP 200/201 + JSON-Body
- **Paginierung:** `?limit=50&offset=0`

---

## Render-Protokoll (Überblick)

Vollständig in `INTEROP.md`, Teil 3 (Render-Worker-Protokoll).

Kurzablauf:

1. Client löst `POST /projects/:id/render-jobs` aus
2. API legt Job an (`queued`)
3. Worker pollt `GET /render-jobs/next` (mit Auth-Token)
4. API sendet Scene Payload, setzt Status `assigned`
5. Worker rendert, setzt Status `running`
6. Worker lädt Ergebnis hoch (`POST /render-jobs/:id/result`)
7. Status -> `done`, Bild-URL verfügbar

---

## CAD/SKP-Interop (Überblick)

Vollständig in `INTEROP.md`, Teil 1 (CAD) und Teil 2 (SKP).

- Import läuft asynchron als `ImportJob`
- Neutrales Zwischenformat: `ImportAsset` (JSON)
- DXF-Import: `LINE`, `LWPOLYLINE`, `POLYLINE`, `ARC`, `CIRCLE`, `TEXT`, `MTEXT`, `INSERT`
- DWG-MVP: Job mit `needs_review` (kein Binary-Parser im MVP)
- DXF-Export: Raumkontur, Wände, Öffnungen, Möbelkonturen auf definierten Layern
- SKP-MVP: Geometrie + Komponenten als Referenzmodell (kein Roundtrip)

---

## Deployment (MVP)

- **lokal:** Docker Compose (Postgres + API + Frontend)
- **Render-Worker:** separater Prozess, kann auf beliebigem Host laufen
- **Dateispeicher:** lokales Filesystem (MVP) -> S3-kompatibel (später)

---

## Phase-2-Erweiterungen (Architektur-Hooks)

Phase 2 (Sprints 20-24, siehe `ROADMAP.md`) erweitert die Architektur, ohne das Grundmodell zu brechen.

### Sprint 20 - Herstellerkatalog & Schrankkonfigurator (Light)

- DB-Tabellen: `manufacturers`, `catalog_articles`, `article_options`, `article_variants`, `article_prices`, `article_rules`
- Domain-Typen: `Manufacturer`, `CatalogArticle`, `ArticleOption`, `ArticleVariant`, `ArticlePrice`, `ArticleRule`
- Neues Herstellerkatalogmodell ersetzt schrittweise `catalog_items`
- Schrankkonfigurator in `planner-frontend` erzeugt `CabinetInstance` + referenzierte `CatalogArticle`/`ArticleVariant`
- `planner-api` integriert Katalogdaten in BOM-/Preislogik (pure Funktionen in `shared-schemas`)

### Sprint 21 - Automatismen (Langteile, Zubehör, Auto-Vervollständigung)

- `AutoCompletionService` im Backend erzeugt Arbeitsplatten-, Sockel- und Zubehör-BOM-Linien anhand von `placements`
- Autogenerierte Einträge werden als `generated` markiert und bei Planungsänderungen deterministisch neu berechnet

### Sprint 22 - Prüf-Engine v2 ("Protect"-Niveau)

- DB-Tabellen: `rule_definitions`, `rule_runs`, `rule_violations`
- Domain-Typen: `RuleDefinition`, `RuleRun`, `RuleViolationRecord`
- Prüfengine als eigener Service in `planner-api`, der Geometrie- und Datenregeln ausführt und Berichte liefert
- Frontend-Prüfpanel zeigt Filter, Schweregrade und "Jump to Problem" im Editor

### Sprint 23 - Multi-Tenant / BI-Light

- Einführung von `tenant_id` und `branch_id` in allen fachlichen Tabellen
- Domain-Typen: `Tenant`, `Branch`, `ProjectKpiSnapshot`, `KpiQuery`
- Middleware in `planner-api` erzwingt Tenant-/Branch-Scope pro Request
- KPI-Endpunkte liefern aggregierte Kennzahlen (Projekte, Angebote, Conversion, Warengruppen)

### Sprint 24 - Online-Webplaner MVP + Handover

- Optionales zweites Frontend-Paket `planner-web` mit vereinfachtem Grundriss und Wizard-UX
- Domain-Typen: `LeadProject`, `LeadPlanningPayload`, `LeadPromotionResult`
- Lead-Planungen werden als `LeadProject` persistiert und können im Profi-Editor zu regulären `Project` promoted werden
- Gemeinsame Nutzung von `shared-schemas` für Geometrie- und Preislogik in beiden Frontends

### Architekturprinzip für künftige Frontends

- Zusätzliche Frontends nutzen dieselben Domänenobjekte und Kernservices, statt parallele Logikpfade aufzubauen
- Multi-Tenant und Lead-/Projekt-Promotionslogik werden im Backend verankert, nicht im UI dupliziert
