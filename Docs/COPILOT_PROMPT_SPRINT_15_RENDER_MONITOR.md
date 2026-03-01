# COPILOT_PROMPT_SPRINT_15_RENDER_MONITOR.md

## Ziel

Baue fuer Sprint 15 eine isolierte Frontend-Komponente, die Renderjobs fuer ein Projekt anlegen und pollen kann, ohne die gesperrten Editor-Dateien anzufassen.

## Nicht anfassen

- `planner-frontend/src/components/editor/CanvasArea.tsx`
- `planner-frontend/src/components/editor/LeftSidebar.tsx`
- `planner-frontend/src/components/editor/RightSidebar.tsx`
- `planner-frontend/src/editor/PolygonEditor.tsx`
- `planner-frontend/src/pages/Editor.tsx`

## Umzusetzen

1. Neuer API-Client:
   - Datei: `planner-frontend/src/api/renderJobs.ts`
   - Funktionen:
     - `createRenderJob(projectId: string, payload?: { scene_payload?: unknown })`
     - `getRenderJob(jobId: string)`
   - Nutze den vorhandenen API-Client/Fetch-Stil des Frontends.

2. Neue isolierte Komponente:
   - Datei: `planner-frontend/src/components/render/RenderJobMonitor.tsx`
   - CSS-Modul: `planner-frontend/src/components/render/RenderJobMonitor.module.css`
   - Props:
     - `projectId: string`
     - `scenePayload?: unknown`
   - Verhalten:
     - Button "Render starten" legt via `POST /api/v1/projects/:id/render-jobs` einen Job an.
     - Danach Polling auf `GET /api/v1/render-jobs/:id` im Abstand von ca. 2 Sekunden.
     - Zeigt Status `queued | assigned | running | done | failed`.
     - Wenn `result.image_url` vorhanden ist, Bildvorschau rendern.
     - Bei `failed` die Fehlermeldung anzeigen.
     - Polling bei `done` oder `failed` stoppen.

3. Isolierte Renderbarkeit:
   - Die Komponente muss ohne Editor-Integration nutzbar sein, nur ueber Props.
   - Keine globale State-Einfuehrung.

## Akzeptanzkriterien

- `RenderJobMonitor` ist isoliert renderbar.
- Job kann erstellt werden.
- Statuswechsel werden sichtbar.
- Bildvorschau fuer fertige Jobs wird angezeigt.
- Fehlerzustand ist vorhanden.
- Keine Aenderungen an den oben ausgeschlossenen Editor-Dateien.

## Rueckmeldung

Bitte nur melden:

- welche Dateien neu/geaendert wurden
- ob die betroffenen Dateien fehlerfrei sind
- ob irgendwo bestehende Dateien ausserhalb des erlaubten Scopes angepasst werden mussten
