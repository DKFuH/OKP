# COPILOT_PROMPT_SPRINT_16_BUSINESS_PANEL.md

## Ziel

Baue fuer Sprint 16 eine isolierte Business-/CRM-Komponente im Frontend, die den neuen Business-Snapshot laden, bearbeiten und exportieren kann, ohne die gesperrten Editor-Dateien anzufassen.

## Nicht anfassen

- `planner-frontend/src/components/editor/CanvasArea.tsx`
- `planner-frontend/src/components/editor/LeftSidebar.tsx`
- `planner-frontend/src/components/editor/RightSidebar.tsx`
- `planner-frontend/src/editor/PolygonEditor.tsx`
- `planner-frontend/src/pages/Editor.tsx`

## Backend-API

Verfuegbar sind:

- `GET /api/v1/projects/:id/business-summary`
- `PUT /api/v1/projects/:id/business-summary`
- `GET /api/v1/projects/:id/export/json`
- `GET /api/v1/projects/:id/export/csv`
- `POST /api/v1/projects/:id/export/webhook`

## Umzusetzen

1. Neuer API-Client:
   - Datei: `planner-frontend/src/api/business.ts`
   - Funktionen:
     - `getBusinessSummary(projectId: string)`
     - `updateBusinessSummary(projectId: string, payload: ...)`
     - `exportBusinessJson(projectId: string)`
     - `exportBusinessCsv(projectId: string)`
     - `exportBusinessWebhook(projectId: string, payload: { target_url: string; event?: string })`

2. Neue isolierte Komponente:
   - Datei: `planner-frontend/src/components/business/BusinessPanel.tsx`
   - CSS-Modul: `planner-frontend/src/components/business/BusinessPanel.module.css`
   - Props:
     - `projectId: string`

3. Verhalten:
   - Laedt beim Mount den Business-Snapshot.
   - Editierbar:
     - `lead_status`
     - `quote_value`
     - `close_probability`
   - Zeigt Listen fuer:
     - `customer_price_lists`
     - `customer_discounts`
     - `project_line_items`
   - Ein einfacher Save-Button speichert den vollen Snapshot via `PUT`.
   - Ein Export-Bereich bietet:
     - JSON-Export anzeigen/herunterladen
     - CSV-Export anstossen
     - Webhook-Export per URL-Feld

4. Scope-Regeln:
   - Keine Editor-Integration.
   - Keine globale State-Einfuehrung.
   - Keine Aenderungen an Routing oder gesperrten Editor-Dateien, ausser falls bereits eine freie separate Seite fuer solche Tools existiert.

## Akzeptanzkriterien

- `BusinessPanel` ist isoliert renderbar.
- Snapshot wird geladen und gespeichert.
- CRM-Felder sind bearbeitbar.
- Listen fuer Preislisten, Rabatte und Line Items werden sichtbar dargestellt.
- JSON-, CSV- und Webhook-Aktionen sind vorhanden.
- Keine Aenderungen an den ausgeschlossenen Editor-Dateien.

## Rueckmeldung

Bitte nur melden:

- welche Dateien neu/geaendert wurden
- ob die betroffenen Dateien fehlerfrei sind
- ob ungewollt ausserhalb des erlaubten Scopes etwas angepasst werden musste
