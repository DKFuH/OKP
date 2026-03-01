# PHASE_2_TASKS_GITHUB_COMPANION.md

## Zuständigkeit: GitHub Companion (Reviewer)
**Fokus:** Architektur-Review, API-Konsistenz, Security-Audit, Datenisolations-Check, UX-Konsistenz.

---

## TASK-20-R01 – Review: Katalog-Datenmodell & Importer
**Sprint:** 20 | **Zuständig:** Claude (+ GROK) | **Priorität:** Muss

### Claude-Prompt (Review)
```
Reviewe das neue Katalog-Datenmodell und die Importer-Logik.
Dateien: `planner-api/prisma/schema.prisma`, `planner-api/src/services/catalogImporter.ts`

Prüfe:
1. Sind die Tabellen `catalog_article`, `article_option` und `article_variant` normalisiert?
2. Deckt die Importer-Validierung Preislisten-Edge-Cases (0-Preis, leere Währung) ab?
3. Ist die Variantenlogik (dims_override_json) stabil gegen ungültige Dimensionen?
4. Werden Hersteller-Codes (SKU) weltweit eindeutig behandelt?

Ergebnis: Befunde je Datei und Empfehlungen zur Schema-Optimierung.
```

---

## TASK-21-R01 – Review: AutoCompletion-Validierung
**Sprint:** 21 | **Zuständig:** GROK (+ Raptor) | **Priorität:** Muss

### GROK-Prompt (Review)
```
Prüfe die automatische Langteile-Generierung (Arbeitsplatten & Sockel) auf mathematische Fehler.
Dateien: `shared-schemas/src/geometry/autoLongParts.ts`, `planner-api/src/services/AutoCompletionService.ts`

Prüfe:
1. Corner-Cases: Was passiert bei sich überschneidenden Schränken oder 180°-Winkeln?
2. Persistenz: Sind die `source_links` bidirektional stabil?
3. Race-Conditions: Was passiert bei parallelen Schrank-Löschungen wärend des Rebuilds?
4. DoS-Risiko: Kann ein sehr komplexes Schrank-Geflecht den Server blockieren?

Konkrete Verbesserungsvorschläge zur Geometrie-Robustheit.
```

---

## TASK-22-R01 – Review: "Protect" Engine v2 Sicherheit
**Sprint:** 22 | **Zuständig:** Raptor (+ Claude) | **Priorität:** Muss

### Raptor-Prompt (Audit)
```
Führe einen Sicherheits-Audit für die neue Prüf-Engine (RuleEngine v2) durch.
Dateien: `planner-api/src/routes/validateV2.ts`, `shared-schemas/src/validation/rules_v2.ts`

Fokus:
1. Injektions-Risiko: Können Regulierungs-Parameter (params_json) schädlichen Code ausführen?
2. DoS: Kann ein User ein Projekt mit 5000 fiktiven Objekten validieren lassen? (Rate Limiting?)
3. Resource-Leaks: Werden RuleRuns und Violations sauber gecleant?
4. Berechtigung: Prüft `POST /validate-v2` den Projektbesitz (Tenant-Scope)?

Sicherheitsbefunde nach Schweregrad (Kritisch/Hoch/Mittel/Niedrig).
```

---

## TASK-23-R01 – Review: Multi-Tenant Datenisolation
**Sprint:** 23 | **Zuständig:** Claude (+ GROK) | **Priorität:** Kritisch

### Claude-Prompt (Isolation Check)
```
Führe einen gründlichen Review der Tenant-Isolations-Middleware durch.
Dateien: `planner-api/src/middleware/tenantScope.ts`, `planner-api/src/services/biService.ts`

Checkliste:
1. Enforce ID: Wird `tenant_id` in JEDER Anfrage (GET/POST/PUT/DELETE) erzwungen?
2. BI Leaks: Liefern die BI-KPI-Endpunkte wirklich nur Daten des aktuellen Mandanten?
3. Join-Attacks: Können cross-tenant Joins via manipulierter IDs provoziert werden?
4. Testing: Gibt es Integrationstests, die versuchen, mit Token A auf Projekt B zuzugreifen?

Antworte mit: Ja/Nein je Check + detaillierte Fehlerfunde.
```

---

## TASK-24-R01 – Review: Webplanner Handover & Datenschutz
**Sprint:** 24 | **Zuständig:** Raptor (+ GPT) | **Priorität:** Soll

### Raptor-Prompt (GDPR/Privacy Audit)
```
Prüfe den Lead-Promotion-Prozess (Webplanner -> Profi) auf Datenschutzkonformität (DSGVO).
Dateien: `planner-api/src/routes/leads.ts`, `planner-frontend/src/webplanner/LeadWizard.tsx`

Prüfe:
1. Consent: Wird das Einverständnis korrekt mit dem Lead-Datensatz gespeichert?
2. Retention: Gibt es eine automatische Löschroutine für nicht-promotete Leads nach X Tagen?
3. Sanatization: Werden Kundendaten vor der Promotion gesäubert (XSS-Schutz im CRM)?
4. Minimalisierung: Werden nur benötigte Felder an das Profi-System übergeben?

Empfehlungen zur Einhaltung der Datenschutzrichtlinien.
```
