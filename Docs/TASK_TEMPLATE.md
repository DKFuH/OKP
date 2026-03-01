# TASK_TEMPLATE.md

## Aufgabenvorlage

```
## TASK-[SPRINT]-[NR] – [Titel]

**Sprint:** [0–19]
**Zuständig:** Claude Code | Codex | Github Companion
**Abhängigkeiten:** [TASK-IDs oder "keine"]
**Priorität:** Muss | Soll | Kann
**Status:** Offen | In Arbeit | Erledigt

### Ziel
[1-2 Sätze was erreicht werden soll]

### Akzeptanzkriterien
- [ ] Kriterium 1
- [ ] Kriterium 2

### Technische Hinweise
[Wichtige Einschränkungen, verwendete Objekte, API-Contracts]

### Nicht in Scope
[Was explizit NICHT gemacht wird]
```

---

## Zuständigkeiten

| Agent | Stärken | Typische Aufgaben |
|---|---|---|
| **Claude Code** | Architektur, API, End-to-End | Repo-Struktur, API-Contracts, Feature-Umsetzung, Datenfluss |
| **Codex** | Algorithmen, isolierte Module | Polygon-Math, Kollision, Preisregeln, BOM, Tests |
| **Github Companion** | Review, Analyse | PR-Review, Dokumentationscheck, Sicherheitsanalyse |

---

## Phase-2 P0/P1 Issue-Vorlagen (direkt nutzbar)

## TASK-20-C01 – Article Pricing & BOM Bridge

**Sprint:** 20 / 21
**Zuständig:** Claude Code | Codex
**Abhängigkeiten:** keine
**Priorität:** Muss
**Status:** Offen

### Ziel
Herstellerartikel aus Phase 2 (`CatalogArticle`/Variante) müssen in BOM und Preislogik korrekt auflösbar und bepreist sein.

### Akzeptanzkriterien
- [ ] `bomCalculator.ts` löst `article_variant_id` belastbar auf.
- [ ] Preisfindung greift auf `ArticlePrice` zurück, Netto-Preis > 0 bei validem Artikeldatensatz.
- [ ] BOM-Zeilen für Herstellerartikel enthalten korrekte `tax_group_id`/MwSt.

### Technische Hinweise
- Fokusdateien: `planner-api/src/services/bomCalculator.ts`, `planner-api/src/services/bomCalculator.test.ts`.
- Verifikation über Unit-Test mit `CatalogArticle`-Placement.

### Nicht in Scope
- Kein Ausbau der BI-Visualisierung.
- Kein Umbau der kompletten PDF-Layoutlogik.

---

## TASK-22-L01 – Fix Rule Engine: 2D World-Collision

**Sprint:** 22
**Zuständig:** Codex
**Abhängigkeiten:** TASK-20-C01
**Priorität:** Muss
**Status:** Offen

### Ziel
Kollisionsprüfung muss wandübergreifend funktionieren (insbesondere 90°-Eckfälle), nicht nur wall-id-lokal.

### Akzeptanzkriterien
- [ ] Alle Placements werden über `getWorldPolygon()` in Weltkoordinaten geprüft.
- [ ] SAT (Separating Axis Theorem) wird für 2D-Überschneidung verwendet.
- [ ] Bei Eckkollision wird `COLL-001` zuverlässig ausgelöst.

### Technische Hinweise
- Fokus auf Validierungs-/Rule-Engine-Pfad (`validateV2`, geometrische Hilfsfunktionen).
- Muss als reproduzierbarer Testfall abgesichert sein: zwei Schränke an 90°-Ecke mit physischer Überlappung.

### Nicht in Scope
- Kein Ausbau weiterer Regelkategorien außerhalb Kollision.

---

## TASK-23-S01 – Security: Tenant Scoping Export/Import

**Sprint:** 23
**Zuständig:** Claude Code
**Abhängigkeiten:** keine
**Priorität:** Muss
**Status:** Offen

### Ziel
Mandantenisolation für Export/Import-Endpunkte durchgängig erzwingen.

### Akzeptanzkriterien
- [ ] `exports.ts` validiert `project.tenant_id` gegen Request-Tenant.
- [ ] `imports.ts` ordnet ImportJobs strikt Request-Tenant zu.
- [ ] Tenant-Routen sind nur mit klarer AuthZ nutzbar (Super-Admin oder tenant-scoped Berechtigung).

### Technische Hinweise
- Cross-Tenant-Aufrufe müssen 403/404 liefern.
- Integrationstests mit Tenant-A/B Szenarien als Pflicht.

### Nicht in Scope
- Keine IdP-Migration (Auth0/Keycloak) in diesem Task.

---

## TASK-21-A01 – Auto-Completion Determinismus

**Sprint:** 21
**Zuständig:** Codex
**Abhängigkeiten:** TASK-20-C01
**Priorität:** Soll
**Status:** Offen

### Ziel
Automatisch generierte Langteile (`GeneratedItem`) müssen deterministisch neu aufgebaut und korrekt bepreist werden.

### Akzeptanzkriterien
- [ ] `GeneratedItem` fließt in `priceCalculator.ts` ein.
- [ ] Rebuild entfernt nur verwaiste generierte Segmente desselben Projekts.
- [ ] `is_generated` bleibt über Speichern/Laden stabil.

### Technische Hinweise
- End-to-End-Szenario: Schrank verschieben -> Auto-Completion -> BOM ersetzt alte Segmente durch neue, bepreiste Segmente.

### Nicht in Scope
- Kein Redesign der Auto-Completion-UI.

---

## TASK-20-F01 – Frontend: Varianten-Selector Pro

**Sprint:** 20
**Zuständig:** Claude Code
**Abhängigkeiten:** keine
**Priorität:** Soll
**Status:** In Arbeit

### Ziel
Konfigurator für Herstellerartikel um vollständige Options-/Variantenführung und Preis-Preview ergänzen.

### Akzeptanzkriterien
- [ ] `ArticleOption` (`enum`) wird dynamisch auf Dropdowns gemappt.
- [ ] Auswahl aktualisiert `selectionOptions`/Editor-State deterministisch.
- [ ] Variantenpreis wird als Live-Preview im Konfigurator angezeigt.

### Technische Hinweise
- Fokus: `LeftSidebar`, `RightSidebar`/`KonfiguratorPanel`, BOM-Payload-Aufbau im Editor.

### Nicht in Scope
- Kein neuer Katalogmodus außerhalb Standard/Hersteller.
