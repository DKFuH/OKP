# PHASE_2_TASKS_CLAUDE.md

## Zuständigkeit: Claude (Antigravity / Claude Code)
**Fokus:** Architektur, API-Endpunkte, Datenbank-Schema, Multi-Tenant-Isolation, System-Integration.

---

## TASK-20-A01 – Herstellerkatalog & Konfigurator (Backend)
**Sprint:** 20 | **Zuständig:** Claude | **Priorität:** Muss
**Abhängigkeiten:** keine (Phase 2 Start)

### Ziel
Datenmodell für Herstellerkataloge und Schrankoptionen implementieren.

### Akzeptanzkriterien
- [x] Schema-Migration für `manufacturer`, `catalog_article`, `article_option`, `article_variant`, `article_price`.
- [x] CRUD Endpunkte für Katalog-Management.
- [x] API-Endpoint für Konfigurator-Snapshots (CabinetInstance mit Referenz auf CatalogArticle).

---

## TASK-21-A01 – AutoCompletionService (Core)
**Sprint:** 21 | **Zuständig:** Claude | **Priorität:** Muss
**Abhängigkeiten:** TASK-20-A01

### Ziel
Service-Schicht zur automatischen Generierung von Langteilen.

### Akzeptanzkriterien
- [x] Tabelle `generated_items` mit `source_links` zur Verknüpfung von Schrank -> Arbeitsplatte/Sockel.
- [x] `AutoCompletionService` im Backend, der auf Änderungen reagiert und Rebuild-Events triggert.

---

## TASK-22-A01 – Rule Engine v2 ("Protect" Framework)
**Sprint:** 22 | **Zuständig:** Claude | **Priorität:** Muss
**Abhängigkeiten:** TASK-21-A01

### Ziel
Skalierbares Framework für Projektprüfungen.

### Akzeptanzkriterien
- [x] Datenmodell für `rule_definitions`, `rule_runs` und `rule_violations`.
- [x] API `POST /projects/:id/validate-v2` zur Orchestrierung aller Einzelprüfungen.
- [x] Persistenz der Prüfungshistorie für "Finalfreigabe".

---

## TASK-23-A01 – Multi-Tenant & BI Endpoints
**Sprint:** 23 | **Zuständig:** Claude | **Priorität:** Muss
**Abhängigkeiten:** TASK-1-01 (Phase 1)

### Ziel
Sichere Trennung der Daten und Bereitstellung von KPI-Exporten.

### Akzeptanzkriterien
- [x] API-Middleware zur Durchsetzung von `tenant_id` Scoping.
- [x] BI-Endpunkte: `/bi/summary`, `/bi/quotes`, `/bi/products` (JSON-Schnittstellen).

---

## TASK-24-A01 – Webplanner Promotion-Logik
**Sprint:** 24 | **Zuständig:** Claude | **Priorität:** Soll
**Abhängigkeiten:** TASK-20-A01

### Ziel
Konvertierung eines Webplanner-Leads in ein vollwertiges Projekt.

### Akzeptanzkriterien
- [x] API `/leads/promote` zum Mapping von vereinfachten Web-Daten in Profi-Strukturen.
- [x] CRM-Integration der Kontaktdaten.
