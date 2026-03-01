# PHASE_2_TASKS_CODEX.md

## Zuständigkeit: Codex
**Fokus:** Algorithmen, Validatoren, Importer/Parser, KPI-Aggregation, Geometrie-Transformationen.

---

## TASK-20-C01 – Katalog-Importer (CSV/JSON Parser)
**Sprint:** 20 | **Zuständig:** Codex | **Priorität:** Muss
**Abhängigkeiten:** keine

### Codex-Prompt
```
Du implementierst einen Katalog-Importer für einen Küchenplaner.
Datei: `planner-api/src/services/catalogImporter.ts`

Typen (siehe PHASE_2_SPRINTS_20_24.md):
  manufacturer(id, name, code)
  catalog_article(id, manufacturer_id, sku, ...)
  article_option, article_variant

Implementiere (pure Funktionen):
1. parseCatalogFile(fileBuffer: Buffer, format: 'csv'|'json'): RawArticle[]
2. validateCatalogSet(set: CatalogArticleImportSet): ValidationResult
   - Prüfe auf Duplikate und Pflichtfelder (SKU, Name, Listpreis)
3. mapToInternalSchema(raw: RawArticle[]): CatalogArticleImportSet
   - Extraktion von Optionen (Farbe, Griff) und Varianten (Breite, Tiefe)

Unit-Tests in catalogImporter.test.ts (vitest).
```

---

## TASK-21-C01 – Langteile-Geometrie-Generator
**Sprint:** 21 | **Zuständig:** Codex | **Priorität:** Muss
**Abhängigkeiten:** keine

### Codex-Prompt
```
Du implementierst die Geometrieberechnung für Auto-Langteile.
Datei: `shared-schemas/src/geometry/autoLongParts.ts`

Logik (aus PHASE_2_SPRINTS_20_24.md):
- Erzeuge Worktop-Segmente entlang zusammenhängender Cabinet-Cluster pro Wand.
- Parameter: Überstand vorne/seitlich (mm), Stoß-Regeln bei Längenlimit.

Implementiere:
1. clusterCabinetsByWall(cabinets: PlacedCabinet[]): CabinetCluster[]
2. calculateWorktopSegments(cluster: CabinetCluster, params: WorktopParams): WorktopSegment[]
   - Berechne Länge basiert auf Clustern plus Überständen.
   - Beachte L-Form Stöße (minimal).
3. calculatePlinthSegments(cluster: CabinetCluster, params: PlinthParams): PlinthSegment[]

Unit-Tests für gerade Zeilen und L-Konfigurationen.
```

---

## TASK-22-C02 – Protect-Regelbibliothek v2
**Sprint:** 22 | **Zuständig:** Codex | **Priorität:** Muss
**Abhängigkeiten:** keine

### Codex-Prompt
```
Du implementierst die erweiterte Regelbibliothek v2.
Datei: `shared-schemas/src/validation/rules_v2.ts`

Implementiere mind. 15 Regeln als pure Funktionen:
1. checkDoorSlam(obj: PlacedObject, others: PlacedObject[]): RuleViolation | null
2. checkErgonomicClearance(floorObj: PlacedObject, wallObj: PlacedObject): RuleViolation | null
3. checkCompleteness(project: Project): RuleViolation[]
   - Warnung bei fehlender Arbeitsplatte/Sockel/Endblenden.
4. checkHeightConstraints(obj: PlacedObject, constraints: CeilingConstraint[]): RuleViolation | null

Unit-Tests für jede Regel einzeln.
```

---

## TASK-23-C02 – KPI Aggregation & BI-Logik
**Sprint:** 23 | **Zuständig:** Codex | **Priorität:** Soll
**Abhängigkeiten:** keine

### Codex-Prompt
```
Du implementierst die Aggregationslogik für Business-KPIs.
Datei: `planner-api/src/services/biAggregator.ts`

Implementiere:
1. aggregateQuoteKPIs(quotes: QuoteSnapshot[], range: DateRange): QuoteSummary
   - Summe Netto, Anzahl, Durchschnittswert, CM-Ranking.
2. calculateConversionRatio(leads: Lead[], wins: WonQuote[]): number
3. getProductPerformance(quoteItems: QuoteItem[]): Map<string, PerformanceStats>

Unit-Tests mit Mock-DB-Dumps.
```

---

## TASK-24-C02 – Webplanner Geometrie-Wizard-Hilfslogik
**Sprint:** 24 | **Zuständig:** Codex | **Priorität:** Soll
**Abhängigkeiten:** keine

### Codex-Prompt
```
Du implementierst Geometrie-Hilfsfunktionen für den Webplanner-Wizard.
Datei: `shared-schemas/src/geometry/webplannerUtils.ts`

Implementiere:
1. simplifyPolygonToWebplanner(vertices: Vertex[]): SimplifiedRoom
   - Reduzierung komplexer Formen auf rechteckige Grundformen oder L-Formen für Web-UX.
2. isCompatibleForWizard(vertices: Vertex[]): boolean
   - Filtert Räume aus, die zu komplex für den schnellen Web-Handover sind.

Unit-Tests.
```
