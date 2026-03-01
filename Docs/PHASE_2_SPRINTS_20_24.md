# PHASE_2_SPRINTS_20_24.md

## Ausgangslage (Stand ~ Sprint 19.5)
MVP bis 19.x liefert:
- Polygonräume, Öffnungen, Dachschrägen (Height Constraints)
- Wall-Placement + Kollisionen + Höhenregeln
- BOM + Preisengine + Angebote + (Blockverrechnung)
- DWG/DXF Import/Export, SKP Referenzimport
- Render-Worker (Job-basiert), Importjob-System

## Ziel Phase 2
Die größten Lücken zu Winner Flex / KPS.MAX schließen, ohne Architekturbruch:
A) Herstellerkatalog + Schrankkonfigurator
B) Automatismen (Langteile/Zubehör/Auto-Vervollständigung)
C) Prüf-Engine v2 (“Protect”-Niveau)
D) Cloud/Mandant/Filiale + BI-Light
E) Online-Webplaner (Lead) + Handover in Profi-Editor

----------------------------------------------------------------

# Sprint 20 — EPIC A: Herstellerkatalog & Schrankkonfigurator (Light)

## Ziel
Herstellerkataloge + Variantenlogik so integrieren, dass:
- ein Hersteller-Import End-to-End funktioniert
- ein konfigurierbarer Schrank Artikel + Preis + BOM sauber erzeugt

## Scope
### Datenmodell (neu/erweitert)
- manufacturer(id, name, code)
- catalog_article(id, manufacturer_id, sku, name, article_type, base_dims_json, meta_json)
- article_option(id, article_id, option_key, option_type, constraints_json)
- article_variant(id, article_id, variant_key, variant_values_json, dims_override_json)
- article_price(id, article_id, price_list_id, valid_from, valid_to, list_net, dealer_net, tax_group_id)
- article_rules(id, article_id, rulepack_json)  // optional light

### Import Pipeline (v1)
- Definiere 1 Importformat (CSV oder JSON) für:
  - articles
  - variants/options
  - prices (mind. list/dealer)
- Implementiere Import für 1 Hersteller (Dummy/Generic)

### Konfigurator Light (Planner)
- UI: Breite/Höhe/Front/Griff (min. 3–5 Optionen)
- Konfigurator erzeugt:
  - CabinetInstance
  - Referenz auf catalog_article + gewählte Optionen
  - Preiskomponenten (PriceEngine übernimmt)

## Nicht-Ziele (hart)
- Keine “voll parametrisierte” Herstellerlogik wie Profi-Systeme
- Keine automatische Bestellübertragung
- Keine 3D-Render-Perfektion

## Deliverables
- docs: MANUFACTURER_CATALOGS.md (Format + Mapping-Regeln)
- importer: /planner-api/import/manufacturer/*
- UI: Konfigurator Drawer/Modal
- Tests: 20 Import-Testfälle + 10 Konfig-Testfälle

## Definition of Done
- 1 Herstellerkatalog importiert
- 1 konfigurierbarer Schrank kann platziert werden
- BOM + Pricing ziehen Daten aus catalog_article/article_price
- Export/Quote zeigt SKU + Optionsausprägungen

----------------------------------------------------------------

# Sprint 21 — EPIC B: Automatismen (Langteile, Zubehör, Auto-Vervollständigung)

## Ziel
Automatische Generierung von:
- Arbeitsplatte
- Sockel
- Wange/Blende (minimal)
- Standard-Zubehör (Griffe/Verbinder/Endkappen light)

## Scope
### Auto-Langteile v1
- Erzeuge Worktop-Segmente entlang zusammenhängender Cabinet-Cluster pro Wand
- Parameter:
  - Überstand vorne/seitlich (mm)
  - Stoß-Regeln (bei Längenlimit)
  - Eckstoß (L-Form minimal)

### Auto-Sockel v1
- Sockelsegmente analog Worktop
- Optional: Regeln für “automatischer Sockel wird entfernt/angepasst” (vgl. Winner Auto-Umfeld-Logik)

### Auto-Zubehör v1
- Regel: wenn CabinetInstance hat Griffbohrung → füge Griffartikel
- Regel: Endseiten/Wangen bei freiem Abschluss

### Persistenz + Update
- Autogen-Objekte als "generated" markieren
- Änderungen an Zeile triggern Rebuild:
  - delete + rebuild (MVP)
  - später diff-based

## UI
- Button: “Auto vervollständigen”
- Diff-View: “hinzugefügt/entfernt/angepasst”

## Deliverables
- service: AutoCompletionService
- schema: generated_items + source_links
- tests: 30 Cases (Gerade Zeile, Insel, Halbinsel, Nischen)

## Definition of Done
- Standardzeile erzeugt automatisch Worktop + Sockel in BOM
- Änderungen (Schrank löschen/verschieben) aktualisieren Langteile konsistent
- Angebot/BOM enthält Langteile als orderbare Positionen (wo möglich)

----------------------------------------------------------------

# Sprint 22 — EPIC C: Prüf-Engine v2 (“Protect”-Niveau)

## Ziel
Aus Regeln v1/v2 wird ein konfigurierbares Prüfmodul:
- Regeldefinitionen mit Parametern
- Kategorien (Kollision/Abstand/Ergonomie/Vollständigkeit/Zubehör)
- Prüfbericht + Finalprüfung
- Jump-to-Problem im Editor

## Scope
### Datenmodell
- rule_definitions(id, rule_key, category, severity, params_json, enabled, tenant_id?)
- rule_runs(id, project_id, run_at, summary_json)
- rule_violations(id, run_id, rule_key, severity, entity_refs_json, message, hint, auto_fix_possible)

### Regeln (mind. 15)
- Kollision: Tür-/Auszugskollision (proxy)
- Abstände: Durchgang, Türflügel
- Ergonomie: Arbeitshöhe/Oberschrankabstand (light)
- Vollständigkeit: keine Arbeitsplatte, keine Sockel, fehlende Endblenden
- Zubehör: fehlende Wangen/Griffe bei definiertem Standard

### Prüfbericht UI
- Filter: severity/category
- Klick → fokussiert Objekt/Wand
- Button: “Finalprüfung” (blocking: nur Warnungen zulässig? konfigurierbar)

## Deliverables
- service: RuleEngine v2
- UI: ProtectReport Panel
- docs: CHECKS_CATALOG.md (Regelkatalog + Param)
- tests: 50 Rule-Tests, 10 Projekt-Regressionen

## Definition of Done
- konfigurierbare Regeln laufen reproduzierbar
- Bericht + Finalprüfung verfügbar
- mind. 15 Regeln aktiv, sinnvoll kategorisiert

----------------------------------------------------------------

# Sprint 23 — EPIC D: Cloud/Mandant/Filiale + BI-Light

## Ziel
Vom Single-Studio zu Multi-Tenant/Branch inkl. KPI-Endpunkte.

## Scope
### Datenmodell
- tenants(id, name)
- branches(id, tenant_id, name, location_json)
- users.tenant_id + users.branch_id
- tenant_id/branch_id in:
  - projects, quotes, price_lists, customer_price_lists, rule_definitions, catalog datasets

### Security / Scope
- API Middleware:
  - tenant-scope enforced
  - optional branch-scope per feature flag

### BI-Light
- KPIs (JSON Endpoints):
  - Angebote pro Zeitraum
  - Angebotswert Summe/Ø
  - Conversion-Status (lead → quote → won/lost light)
  - Top Warengruppen nach Umsatz/Deckungsbeitrag (light)

### Minimal Dashboard
- 1 simple UI Page: KPI Cards + Zeitraumfilter

## Deliverables
- migrations + indexes
- docs: MULTI_TENANT.md
- endpoints: /bi/summary, /bi/quotes, /bi/products
- tests: tenant isolation tests

## Definition of Done
- 2 Tenants sauber getrennt (Daten + Auth)
- KPI-Endpunkte liefern plausible Kennzahlen
- Basis-Dashboard zeigt KPIs

----------------------------------------------------------------

# Sprint 24 — EPIC E: Online-Webplaner MVP + Handover

## Ziel
Ein abgespeckter Endkunden-Webplaner (Lead Gen) mit Übergabe ins Profi-Tool.

## Scope
### Endkunden-Planer (separates Frontend oder Mode)
- Raum: rechteckig + Aussparungen (simplified)
- Katalog: stark reduziert (Standardzeilen/Blöcke)
- Platzierung: guided (Wizard)
- Ergebnis: lead_project + contact data + consent

### Handover
- lead_project wird zu project “promoted”
- mapping:
  - room geometry (simplified → polygon)
  - cabinet list → catalog articles (best effort)
  - lead fields → CRM fields

### Datenschutz
- Consent fields + retention policy (config)

## Deliverables
- frontend: /webplanner (new app or mode)
- api: /leads/create, /leads/promote
- docs: WEBPLANNER_HANDOVER.md
- tests: 10 end-to-end flows

## Definition of Done
- Endkunde kann einfache Küche konfigurieren
- Lead wird gespeichert + an Studio übergeben
- Studio kann Lead-Projekt im Profi-Editor öffnen und weiterplanen
- Angebotserstellung aus promoted project möglich

----------------------------------------------------------------

# Notes / Risiken (bewusst)
1) Herstellerkatalogtiefe wird nicht “Winner/KPS”-Niveau erreichen ohne langfristige Datenpflege.
2) Automatismen müssen deterministisch und testbar sein → sonst zerlegt es Pricing/BOM.
3) Prüf-Engine braucht klare DoD, sonst wird es “Rule-Spaghetti”.
4) Multi-Tenant muss früh mit Migrations-/Index-Disziplin kommen.
5) Webplaner ist ein anderes Produkt: guided UX, nicht Profi-Editor im Browser.