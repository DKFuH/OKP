# SPRINT_16_CODEX.md

## Umfang

Umsetzung Sprint 16 (Business-/Integrations-Sprint):

- CRM-Felder am Projekt
- kundenbezogene Preis- und Rabattdaten
- projektbezogene Vertriebs-/Zusatzpositionen
- Exporte als JSON, CSV und Webhook

## Umgesetzte Dateien

- `planner-api/prisma/schema.prisma`
- `planner-api/src/routes/business.ts`
- `planner-api/src/routes/business.test.ts`
- `planner-api/src/routes/projects.ts`
- `planner-api/src/index.ts`

## Ergebnis Sprint 16

Implementiert wurde:

- Neue Persistenz im Prisma-Schema:
  - `customer_price_lists`
  - `customer_discounts`
  - `project_line_items`
  - CRM-Felder am Projekt: `lead_status`, `quote_value`, `close_probability`

- Neue API-Routen:
  - `GET /api/v1/projects/:id/business-summary`
  - `PUT /api/v1/projects/:id/business-summary`
  - `GET /api/v1/projects/:id/export/json`
  - `GET /api/v1/projects/:id/export/csv`
  - `POST /api/v1/projects/:id/export/webhook`

- Verhalten:
  - `business-summary` liefert Projekt-CRM, kundenbezogene Preislisten, Rabatte und projektbezogene Line Items in einem Snapshot.
  - `PUT /business-summary` ersetzt die uebergebenen Business-Listen vollstaendig und berechnet `line_net` fuer `project_line_items`.
  - `export/json` liefert einen maschinenlesbaren Snapshot.
  - `export/csv` liefert einen flachen Multi-Section-Export fuer Weiterverarbeitung.
  - `export/webhook` sendet denselben Snapshot aktiv an ein Zielsystem.

- Projektliste:
  - `GET /api/v1/projects` gibt jetzt auch `lead_status`, `quote_value` und `close_probability` mit aus.

## DoD-Status Sprint 16

- `customer_price_lists`: **erfuellt**
- `customer_discounts`: **erfuellt**
- `project_line_items`: **erfuellt**
- CRM-Felder: **erfuellt**
- JSON-/CSV-/Webhook-Export: **erfuellt**

## Verifikation

- `npm run db:generate` in `planner-api`
- `npm test -- --run src/routes/business.test.ts` in `planner-api`
- `npm run build` in `planner-api`
- `npm test` in `planner-api`

## Hinweise

- `PUT /business-summary` ist bewusst als Full-Snapshot-Update gebaut. Nicht mitgeschickte Preislisten, Rabatte oder Line Items werden ersetzt.
- Die Webhook-Integration ist bewusst leichtgewichtig: direkter HTTP-POST ohne Retry-/Signatur-/Queue-Mechanik.

## Naechster Sprint

Sprint 17:

- Blockprogramme persistent machen
- Block-Definitionsdaten und Gruppen pflegen
- Projektbezogene Blockbewertungen speichern
