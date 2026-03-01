# SPRINT_15_CODEX.md

## Umfang

Umsetzung Sprint 15 (Render-Job-System + externer Render-Worker MVP):

- Renderjob anlegen
- Queue-/Statusfluss
- Worker-Registrierung und Job-Zuweisung
- Ergebnisrueckgabe mit Render-Metadaten
- Persistente Worker-Registry ueber `render_nodes`

## Umgesetzte Dateien

- `planner-api/prisma/schema.prisma`
- `planner-api/src/routes/renderJobs.ts`
- `planner-api/src/routes/renderJobs.test.ts`
- `planner-api/src/index.ts`

## Ergebnis Sprint 15

Implementiert wurde:

- `POST /api/v1/projects/:id/render-jobs`
  - erzeugt Renderjob im Status `queued`
  - akzeptiert optionales `scene_payload`

- `GET /api/v1/render-jobs/:id`
  - liefert Jobstatus inkl. Ergebnisobjekt

- `POST /api/v1/render-workers/register`
  - registriert Worker persistent in `render_nodes`
  - liefert `worker_id`, `node_name` und `status`

- `POST /api/v1/render-workers/:workerId/fetch-job`
  - prueft Worker ueber `render_nodes`
  - aktualisiert `last_seen_at`
  - weist den aeltesten `queued` Job zu (`assigned`)

- `POST /api/v1/render-workers/:workerId/jobs/:jobId/start`
  - setzt Job auf `running`
  - verlangt registrierten Worker aus `render_nodes`

- `POST /api/v1/render-workers/:workerId/jobs/:jobId/complete`
  - setzt Job auf `done`
  - schreibt/aktualisiert `render_job_results`
  - aktualisiert Worker-Heartbeat

- `POST /api/v1/render-workers/:workerId/jobs/:jobId/fail`
  - setzt Job auf `failed` inkl. Fehlermeldung
  - aktualisiert Worker-Heartbeat

Statusfluss abgedeckt:

- `queued -> assigned -> running -> done/failed`

## DoD-Status Sprint 15

- Renderjob anlegen: **erfuellt**
- Queue-Status + Worker-Flow: **erfuellt**
- Scene Payload Uebergabe: **erfuellt (MVP: passthrough)**
- End-to-End API-Flow Job -> Ergebnis: **erfuellt**
- `render_nodes`-Persistenz: **erfuellt**

## Verifikation

- `npm run db:generate` in `planner-api`
- `npm test -- --run src/routes/renderJobs.test.ts` in `planner-api`
- `npm run build` in `planner-api`

## Hinweise

- Die Worker-Zuordnung an `render_jobs.worker_id` bleibt im MVP ein String-Foreign-Key-ohne-Relation. Fuer Leasing, Timeouts und Offline-Erkennung reicht das noch nicht.
- `render_nodes.status` wird aktuell nur auf `active` gesetzt. Ein echter Offline-/Lease-Mechanismus ist ein sinnvoller Ausbau fuer die naechste Stufe.

## Naechster Sprint

Sprint 16:

- Business-/Integrations-Sprint
- CRM-Felder und Exporte (JSON/CSV/Webhook)
- kundenbezogene Preis-/Rabatt-Erweiterungen
