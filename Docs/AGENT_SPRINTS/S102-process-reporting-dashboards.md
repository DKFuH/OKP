# Sprint 102 - Process Reporting und Transparenz-Dashboards

**Branch:** `feature/sprint-102-process-reporting-dashboards`
**Gruppe:** B
**Status:** `planned`
**Abhaengigkeiten:** S99 (Workflow Events), S100 (Masterdaten), S49 (Analytics Reports)

## Ziel

Prozesskennzahlen sollen auf Basis realer Workflow- und Auftragsereignisse sichtbar werden, damit Engpaesse, SLA-Verletzungen und Durchlaufzeiten operativ steuerbar sind.

Leitidee: measure flow, improve flow.

---

## 1. Scope

In Scope:

- Event-basiertes Reporting fuer Kernprozesse
- Dashboard-Widgets fuer Durchlaufzeit, WIP, Bottlenecks, SLA
- Drilldown von KPI auf Auftrag/Projekt
- Exportierbare Report-Ansichten (CSV/PDF)

Nicht in Scope:

- Predictive Analytics / Forecasting in V1
- frei programmierbare BI-Abfragesprache

---

## 2. KPI-Katalog (MVP)

Pflicht-KPIs:

- Lead-zu-Angebot Zeit
- Angebot-zu-Auftrag Zeit
- Auftrag-zu-Produktion Start
- Produktion-zu-Montage Fertig
- Anteil blockierter Auftraege je Status
- offene Faelle pro Standort/Team

---

## 3. Architektur

Datenfluss:

- Workflow/Order Events -> Reporting Ingest -> Aggregations-Tabellen
- Aggregationen nach Tenant, Standort, Zeitraum, Prozessschritt
- periodische Rebuild-Jobs fuer konsistente Historie

Bausteine:

- `reportingIngestService`
- `processKpiAggregator`
- `dashboardQueryService`
- `reportExportService`

---

## 4. API-Schnittstellen

Geplante Endpunkte:

- `GET /reports/process/kpis?from=...&to=...`
- `GET /reports/process/bottlenecks`
- `GET /reports/process/timeline/:entityId`
- `GET /dashboards/process/overview`
- `POST /reports/process/export`

Anforderungen:

- konsistente Zeitfilter (UTC + Zeitzonenhinweis)
- tenant- und rollenbasierte Sichtbarkeit
- stabile Antwortzeiten fuer Dashboard-Queries

---

## 5. Frontend-UX

MVP-Komponenten:

- Prozess-Overview mit KPI-Kacheln
- Bottleneck-Heatmap nach Status/Team
- Drilldown-Tabellen mit Filterchips
- Exportdialog fuer CSV/PDF

UX-Regeln:

- jede Kennzahl erklaert Datengrundlage
- Warnhinweis bei unvollstaendigen Daten
- Filterzustand als URL-state teilbar

---

## 6. Tests

Mindestens:

- 10+ Service-Tests fuer KPI-Aggregation
- 8+ Route-Tests fuer Reporting-APIs
- 4+ Frontend-Tests fuer Filter/Drilldown/Export
- 4+ Security-Negativtests fuer tenantfremde Daten

Verifikation:

- Referenzdatensatz liefert erwartete KPI-Werte
- Exportdateien sind schema-stabil und lesbar

---

## 7. DoD

- Kern-KPIs sind fuer definierte Zeitraeume abrufbar
- Dashboard zeigt Engpaesse und Durchlaufzeiten reproduzierbar
- Drilldown auf konkrete Auftraege ist moeglich
- Export funktioniert fuer mindestens CSV und PDF
- KPI- und Security-Tests sind gruen

---

## 8. Nicht Teil von Sprint 102

- ML-basierte Vorhersagemodelle
- frei konfigurierbare Dashboard-Baukaesten fuer Endnutzer
- unternehmensuebergreifende Benchmarking-Funktion

---

## 9. Open-Source-Compliance

- Nutzung allgemeiner Reporting-Patterns ist unkritisch.
- Keine Uebernahme fremder Chart-Konfigurationen oder proprietaerer Dashboards.
- Eigene KPI-Definitionen und Datenpipelines bleiben verbindlich.
