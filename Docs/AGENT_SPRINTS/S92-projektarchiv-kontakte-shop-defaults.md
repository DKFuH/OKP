# Sprint 92 - Projektarchiv, Kontakte & Shop-Defaults

**Branch:** `feature/sprint-92-projektarchiv-kontakte-shop-defaults`
**Gruppe:** A (startbar nach S49)
**Status:** `planned`
**Abhaengigkeiten:** S47, S49, S84

---

## Ziel

Projektarchiv, Kontaktregister und tenantweite Standardwerte zusammenziehen:
Projektstatus, Standardberater, Standardbereich und Kontaktrollen sollen
konfigurierbar, filterbar und archivfest sein.

---

## 1. Backend

Einzufuehren:

- archivierte Projekte mit `archived_at`, `retention_until`, `archive_reason`
- tenantweite Defaults fuer `advisor`, `processor`, `area_name`, `alternative_name`
- erweitertes Kontaktmodell fuer Unternehmen, Privatkontakte und Ansprechpartner

Neue Endpunkte:

- `GET /projects/archive`
- `POST /projects/:id/archive`
- `POST /projects/:id/restore`
- `GET /tenant/project-defaults`
- `PUT /tenant/project-defaults`

---

## 2. Frontend

- Archivansicht mit Suche, Filtern und Restore
- Settings-Seite fuer Projekt-Defaults
- Kontaktregister mit Rollen, Typ und Zuordnung zu Projekten

---

## 3. DoD

- archivierte Projekte verschwinden aus der aktiven Projektliste
- Restore bringt ein Projekt inklusive Kontakten wieder zurueck
- neue Projekte uebernehmen tenantweite Defaults automatisch
- mindestens 12 Tests fuer Archiv, Restore und Defaults
