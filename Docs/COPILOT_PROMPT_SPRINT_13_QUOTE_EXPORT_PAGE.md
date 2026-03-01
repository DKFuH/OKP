# COPILOT_PROMPT_SPRINT_13_QUOTE_EXPORT_PAGE.md

## GitHub-Copilot-Prompt

Arbeite im Repo `YAKDS` und uebernimm eine isolierte Frontend-Anschlussaufgabe fuer Sprint 13.

Backend-Vertrag:

- `POST /api/v1/projects/:id/create-quote`
- `GET /api/v1/quotes/:id`
- `POST /api/v1/quotes/:id/export-pdf`
  - liefert ein echtes PDF-Attachment mit `application/pdf`

Ziel:

- Baue eine kleine, eigenstaendige Quote-Export-UI ohne Eingriff in die aktiven Editor-Dateien

Bitte umsetzen:

- Neue API-Datei `planner-frontend/src/api/quotes.ts`
  - `createQuote(projectId, payload)`
  - `getQuote(id)`
  - `exportQuotePdf(id)` als Download-Helfer
- Neue Komponente `planner-frontend/src/components/quotes/QuoteExportPanel.tsx`
  - Props mindestens `projectId`
  - Button zum Erzeugen eines Angebots
  - Button zum PDF-Export fuer ein geladenes Angebot
  - einfache Anzeige von Angebotsnummer, Version und Gueltig-bis
- Optionales Stylesheet `planner-frontend/src/components/quotes/QuoteExportPanel.module.css`

Wichtige Grenzen:

- Nicht anfassen:
  - `planner-frontend/src/components/editor/CanvasArea.tsx`
  - `planner-frontend/src/components/editor/LeftSidebar.tsx`
  - `planner-frontend/src/components/editor/RightSidebar.tsx`
  - `planner-frontend/src/editor/PolygonEditor.tsx`
  - `planner-frontend/src/pages/Editor.tsx`
- Kein globaler Refactor
- TypeScript strikt halten

Akzeptanz:

- Panel ist isoliert renderbar
- PDF-Export nutzt den echten Binary-Endpoint und triggert einen Download
- Keine Abhaengigkeit von den gesperrten Editor-Dateien
