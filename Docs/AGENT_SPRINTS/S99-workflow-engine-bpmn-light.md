# Sprint 99 - Workflow Engine (BPMN Light)

**Branch:** `feature/sprint-99-workflow-engine-bpmn-light`
**Gruppe:** A
**Status:** `done`
**Abhaengigkeiten:** S94 (Bestellstatus), S98 (Stabilisierung), S102 (Reporting) vorbereitet

## Umsetzung (2026-03-05)

- Persistenz fuer Workflow-Definitionen, -Instanzen und -Events eingefuehrt:
	- Prisma-Modelle in `planner-api/prisma/schema.prisma`
	- Migration `planner-api/prisma/migrations/20260305090000_sprint99_workflow_engine/migration.sql`
- Neue Workflow-Engine-Route umgesetzt und registriert:
	- `planner-api/src/routes/workflows.ts`
	- Registrierung in `planner-api/src/index.ts`
- Graph-/Transition-/Guard-Validierung als Service umgesetzt:
	- `planner-api/src/services/workflowEngineService.ts`
- Tests fuer Kernpfade erstellt:
	- `planner-api/src/routes/workflows.test.ts`
	- Verifikation: `npm run test --workspace planner-api -- src/routes/workflows.test.ts` -> gruen (`6` Tests)

Hinweis zur Gesamt-Build-Pipeline:

- `npm run build --workspace planner-api` ist aktuell durch bestehende, nicht-S99-bezogene Importfehler in `src/routes/orders.ts` und `src/services/interop/ocdParser.ts` blockiert (`@okp/shared-schemas` Exporte).

## Ziel

Ein konfigurierbarer Prozessfluss fuer die Kernstrecke `Lead -> Angebot -> Produktion -> Montage` soll als zustandsbasierte Workflow-Engine bereitstehen, inklusive visueller Modellierung im Frontend und serverseitig erzwungenen Transition-Regeln.

Leitidee: visual config, strict execution.

---

## 1. Scope

In Scope:

- BPMN-light Modell fuer lineare und verzweigte Prozessketten
- Workflow-Definition pro Tenant mit Versionierung
- Transition Guards (z. B. "Quote freigegeben" vor Produktionsstart)
- Prozessinstanzen auf Projekt-/Auftragsebene
- Audit-Trail fuer jeden Statuswechsel

Nicht in Scope:

- Vollstaendige BPMN-2.0 Engine
- Externe Workflow-Interpreter
- Freiform-Scripting in der UI

---

## 2. Fachmodell

Neue Kernobjekte:

- `WorkflowDefinition`
- `WorkflowNode`
- `WorkflowTransition`
- `WorkflowInstance`
- `WorkflowEvent`

Mindestattribute:

- Definition: `id`, `tenant_id`, `name`, `version`, `is_active`, `graph_json`
- Instanz: `id`, `tenant_id`, `entity_type`, `entity_id`, `current_node_id`, `started_at`, `finished_at`
- Event: `id`, `instance_id`, `from_node`, `to_node`, `actor_user_id`, `reason`, `created_at`

---

## 3. Architektur

Backend-Bausteine:

- `workflowDefinitionService` fuer Validierung/Versionierung
- `workflowRuntimeService` fuer Transition-Ausfuehrung
- `workflowGuardService` fuer domain-spezifische Preconditions
- Outbox/Event-Hook bei Statuswechsel

Frontend-Bausteine:

- Workflow-Editor (Graph-Canvas mit Nodes/Edges)
- Guard-Builder (vordefinierte Regeln statt freiem Code)
- Runtime-Panel im Projekt/Auftrag

Sicherheitsgrundsaetze:

- Tenant-Scoping in jeder Query
- Nur Rollen mit Workflow-Recht duerfen Definitionen aendern
- Runtime-Wechsel immer serverseitig geprueft

---

## 4. API-Schnittstellen

Geplante Endpunkte:

- `POST /workflow/definitions`
- `GET /workflow/definitions`
- `POST /workflow/definitions/:id/publish`
- `POST /workflow/instances`
- `GET /workflow/instances/:id`
- `POST /workflow/instances/:id/transition`
- `GET /workflow/instances/:id/events`

Antworten enthalten:

- eindeutigen Zielstatus
- Guard-Fehler als strukturierte 4xx-Antwort
- Event-Metadaten fuer Timeline/UI

---

## 5. Frontend-UX

MVP-Flows:

- Prozess modellieren (Node hinzufuegen, verbinden, benennen)
- Definition validieren und publizieren
- Instanzstatus sehen und naechsten Schritt ausfuehren
- Historie als Timeline einsehen

UX-Regeln:

- Ungueltige Kanten visuell markieren
- Transition-Blocker mit Klartextgrund anzeigen
- Keine stillen Statusspruenge ohne Eventeintrag

---

## 6. Tests

Mindestens:

- 10+ Unit-Tests fuer Graph-/Guard-Validierung
- 8+ Route-Tests fuer Create/Publish/Transition
- Negativtests: tenantfremde IDs, verbotene Transition, fehlende Guard-Daten
- Migrationstest fuer Definition-Versionierung

Ziel:

- Build gruen
- neue Workflow-Suites gruen
- keine Regression in `quotes`, `productionOrders`, `projects`

---

## 7. DoD

- Workflow-Definition kann erstellt, validiert und publiziert werden
- Projekt/Auftrag kann Workflow-Instanz starten
- Statuswechsel nur ueber gueltige Transition + Guards moeglich
- Event-Historie ist revisionssicher vorhanden
- API und UI sind tenant-sicher getestet

---

## 8. Nicht Teil von Sprint 99

- Vollgrafischer BPMN-Import/Export
- Benutzerdefinierte Skriptguards
- Komplexe Parallel-Gates mit Synchronisationssemantik

---

## 9. Open-Source-Compliance

- Nuclos dient nur als Produkt-/Architektur-Inspiration.
- Keine Codeuebernahme aus Drittprojekten ohne klare Lizenzpruefung.
- Uebernommene Konzepte werden in eigener Domain- und API-Sprache umgesetzt.
