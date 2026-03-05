OpenKitchenPlanner (OKP)

English | Deutsch



<a name="english"></a>
🇬🇧 English
OpenKitchenPlanner is a web-based planning platform for carpentry workshops and kitchen studios. It combines room modeling, catalog and CAD workflows, pricing, quote generation, and export pipelines in one monorepo.
🚀 Release Status
 * Current Channel: v0.1.0-rc1 (2026-03-04)
 * Stabilization Focus: Sprint 98 (Core-path hardening, tenant-scope checks, regression cleanup).
 * Verification: Full build & test suite green.
🛠 Core Capabilities
 * Modeling: Polygonal rooms with wall-based constraints, sloped ceilings, and curved walls (Phase 13).
 * Business: 9-step pricing engine, BOM calculation, and professional PDF quote generation with company branding (Phase 10).
 * Project Management: Kanban boards, Gantt charts, document management (DMS), and tenant-aware CRM light.
 * Production: Cutlists, CNC nesting (DXF export), and internal production orders (Phase 11).
 * Interop: IFC (BIM), DXF/DWG, SketchUp import, and GLTF/GLB exports for AR/VR (Phase 7).
 * AI Integration: Full MCP (Model Context Protocol) support for AI-assisted planning (e.g., via Claude).
🏗 Roadmap Overview
The project has evolved through several key phases:
 * MVP (Sprints 0-19): Core geometry, catalog, and basic pricing.
 * Professionalization (Sprints 20-60): Multi-tenancy, high-end room interactions, and ground-plan tracing.
 * Industry Excellence (Sprints 61-83): Building levels (multi-floor), staircases, and room acoustics visualization.
 * Refinement (Sprints 84-98): Internationalization (i18n), CAD-like navigation, and deep stabilization.
💻 Tech Stack
 * Frontend: React + TypeScript + Vite + Konva.js / Three.js
 * Backend: Node.js + Fastify + TypeScript
 * Database: PostgreSQL via Prisma ORM
 * Validation: Zod + shared-schemas
 * Testing: Vitest
<a name="deutsch"></a>
🇩🇪 Deutsch
OpenKitchenPlanner ist eine webbasierte Planungsplattform für Schreinereien und Küchenstudios. Es vereint Raumplanung, Katalog- und CAD-Workflows, Kalkulation, Angebotserstellung und Export-Pipelines in einem Monorepo.
🚀 Release-Status
 * Aktueller Kanal: v0.1.0-rc1 (04.03.2026)
 * Stabilisierungsschwerpunkt: Sprint 98 (Härtung der Kernpfade, Mandanten-Prüfungen, Regression-Cleanup).
 * Verifizierungsstand: Full Build & Test-Suite grün.
🛠 Kernfunktionen
 * Modellierung: Polygonale Räume mit Wand-Constraints, Dachschrägen und gebogenen Wänden (Phase 13).
 * Business: 9-stufige Kalkulations-Engine, Stücklisten (BOM) und PDF-Angebotserstellung mit Firmenbranding (Phase 10).
 * Projektsteuerung: Kanban-Boards, Gantt-Charts, Dokumentenmanagement (DMS) und mandantenfähiges CRM-Light.
 * Produktion: Zuschnittlisten, CNC-Nesting (DXF-Export) und interne Produktionsaufträge (Phase 11).
 * Interop: IFC (BIM), DXF/DWG, SketchUp-Import und GLTF/GLB-Exporte für AR/VR (Phase 7).
 * KI-Integration: Volle MCP-Unterstützung (Model Context Protocol) für KI-gestützte Planung (z.B. via Claude).
🏗 Roadmap-Überblick
Das Projekt wurde durch verschiedene Phasen entwickelt:
 * MVP (Sprints 0-19): Kerngeometrie, Katalog und Basis-Kalkulation.
 * Professionalisierung (Sprints 20-60): Mehrmandantenfähigkeit, High-End Wand-Interaktoren und Grundriss-Nachzeichnen.
 * Branchen-Exzellenz (Sprints 61-83): Ebenen-Management (Mehrgeschossig), Treppenbau und Raumakustik-Visualisierung.
 * Refinement (Sprints 84-98): Internationalisierung (i18n), CAD-Navigation und Tiefenstabilisierung.
📂 Monorepo Structure
open-kitchen-planner/
├── planner-frontend/      # React app (Konva/Three.js)
├── planner-api/           # Fastify REST API & MCP Server
├── shared-schemas/        # Shared domain types (Zod)
├── interop-cad/           # DXF/DWG import & export
├── interop-ifc/           # BIM/IFC integration (Phase 7)
├── interop-sketchup/      # SKP import
└── Docs/                  # Architecture, Roadmap, Sprint Docs

🛠 Setup & Installation
Prerequisites / Voraussetzungen
 * Node.js: 20+ (22.x recommended)
 * Docker Desktop: Recommended for Database & API runtime.
Option A: Docker (Recommended / Empfohlen)
# Build and start PostgreSQL + API
docker-compose up -d --build postgres api

# Apply Prisma schema
docker-compose exec api npm run db:push

# Start Frontend locally
npm run dev --workspace planner-frontend

Option B: Local Node.js
npm install
npm run db:generate
# Configure .env in planner-api/
npm run dev --workspace planner-api
npm run dev --workspace planner-frontend

🧪 Testing & Security
# Full monorepo tests
npm test

# Security-focused smoke suite (Tenants & Quotes)
npm run test --workspace planner-api -- src/routes/quotes.test.ts src/routes/tenantSettings.test.ts

📄 Documentation / Dokumentation
 * Architecture
 * Roadmap Details
 * Interop Guide (IFC/DXF)
 * S98 Stabilization
⚖️ License / Lizenz
Copyright 2026 Tischlermeister Daniel Klas.
Licensed under the Apache License 2.0.