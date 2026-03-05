# Sprint 100 - Masterdaten Registry und Studio-Sync

**Branch:** `feature/sprint-100-masterdata-registry-sync`
**Gruppe:** A
**Status:** `done`
**Abhaengigkeiten:** S92 (Kontakte/Defaults), S99 (Workflow Engine), S98 (Stabilisierung)

## Umsetzung (2026-03-05)

- Masterdata Registry fuer drei Kernentitaeten umgesetzt:
	- `master_customers`, `master_suppliers`, `master_locations`
	- Felder inkl. `external_ref`, `payload_json`, `version`, `is_deleted`, `updated_at`
- Sync-Infrastruktur eingefuehrt:
	- `master_sync_subscriptions`
	- `master_sync_checkpoints`
	- `master_sync_conflicts`
- API-Routen fuer CRUD + Sync + Konfliktaufloesung umgesetzt:
	- `planner-api/src/routes/masterdata.ts`
	- Endpunkte:
		- `GET/POST/PATCH /masterdata/:entity`
		- `GET /masterdata/sync/delta`
		- `POST /masterdata/sync/ack`
		- `GET /masterdata/sync/conflicts`
		- `POST /masterdata/sync/conflicts/:id/resolve`
- Route in API-Bootstrap registriert:
	- `planner-api/src/index.ts`
- Persistenzmodell und Migration geliefert:
	- `planner-api/prisma/schema.prisma`
	- `planner-api/prisma/migrations/20260305100000_sprint100_masterdata_registry_sync/migration.sql`
- Tests geliefert:
	- `planner-api/src/routes/masterdata.test.ts`

Verifikation:

- `npm run db:generate --workspace planner-api` -> erfolgreich
- `npm run test --workspace planner-api -- src/routes/masterdata.test.ts` -> gruen (`6` Tests)
- `npm run build --workspace planner-api` -> erfolgreich

## Ziel

Eine zentrale Masterdaten-Registry fuer Kunden, Lieferanten und Standorte soll als Single Source of Truth eingefuehrt werden, inklusive robuster Synchronisation in angeschlossene Studios/Clients.

Leitidee: one truth, many consumers.

---

## 1. Scope

In Scope:

- `MasterDataRegistry` fuer Kernobjekte
- Versionierte Datensaetze mit `updated_at`/`version`
- Pull- und Push-Sync-Endpunkte
- Delta-Sync mit Cursor
- Konfliktstrategie fuer konkurrierende Aenderungen

Nicht in Scope:

- Vollstaendiges MDM mit Dubletten-Matching per KI
- Stammdatenmodell fuer alle moeglichen ERP-Domaenen in V1

---

## 2. Fachmodell

Objekte V1:

- `MasterCustomer`
- `MasterSupplier`
- `MasterLocation`
- `SyncSubscription`
- `SyncCheckpoint`
- `SyncConflict`

Mindestattribute:

- jede Entitaet: `id`, `tenant_id`, `external_ref`, `payload_json`, `version`, `is_deleted`
- Subscription: `target_system`, `scope`, `last_sync_cursor`, `status`
- Conflict: `entity_type`, `entity_id`, `incoming_version`, `resolved_by`, `resolved_at`

---

## 3. Architektur

Backend-Bausteine:

- `masterDataService` (CRUD + Validation)
- `syncEngineService` (Delta-Erzeugung, Cursor, Retry)
- `conflictResolverService` (Last-Write-Wins oder manuell)
- Outbox fuer verteilte Zustellung

Betrieb:

- idempotente Sync-Nachrichten
- exponential backoff bei temporaeren Fehlern
- Dead-letter fuer dauerhaft unzustaellbare Events

---

## 4. API-Schnittstellen

Geplante Endpunkte:

- `GET /masterdata/customers`
- `POST /masterdata/customers`
- `PATCH /masterdata/customers/:id`
- `GET /masterdata/sync/delta?cursor=...`
- `POST /masterdata/sync/ack`
- `GET /masterdata/sync/conflicts`
- `POST /masterdata/sync/conflicts/:id/resolve`

Regeln:

- harte Tenant-Isolation
- optimistic concurrency via `version`
- `409` bei Konflikt, inkl. diff-Metadaten

---

## 5. Frontend-UX

MVP-Seiten:

- Registry-Liste (Kunden/Lieferanten/Standorte)
- Detailansicht mit Versionshistorie
- Sync-Monitor mit letzten Laeufen und Fehlern
- Konflikt-Dialog fuer manuelle Aufloesung

UX-Prioritaeten:

- klare Anzeige "lokal vs zentral"
- Filter auf veraltete Datensaetze
- Bulk-Aktionen fuer Re-Sync

---

## 6. Tests

Mindestens:

- 12+ Unit-Tests fuer Delta-/Cursor-Logik
- 8+ Route-Tests fuer CRUD + Sync-Endpunkte
- 5+ Integrationsfaelle fuer Konflikte und Retry
- Security-Negativtests fuer tenantfremden Zugriff

Ziel:

- deterministische Delta-Syncs
- kein Datenverlust bei Retries
- saubere Konfliktprotokollierung

---

## 7. DoD

- Masterdaten koennen zentral gepflegt werden
- Delta-Sync liefert nur geaenderte Datensaetze seit Cursor
- Konflikte werden erkannt und reproduzierbar aufgeloest
- Sync-Status ist transparent im UI einsehbar
- API-/Service-Tests fuer Kernpfade sind gruen

---

## 8. Nicht Teil von Sprint 100

- Dublettenbereinigung ueber mehrere Tenants
- BI-Auswertungen auf Registry-Daten
- Vollautomatische Konfliktaufloesung fuer alle Typen

---

## 9. Open-Source-Compliance

- Konzeptuelle Orientierung an etablierten ERP-Mustern.
- Keine direkte Uebernahme fremder Implementierungen oder Assets.
- Eigene Datenmodelle und Contracts bleiben projektintern definiert.
