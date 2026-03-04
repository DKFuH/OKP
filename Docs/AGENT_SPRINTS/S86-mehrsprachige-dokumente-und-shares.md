# Sprint 86 - Mehrsprachige Dokumente & Shares

**Branch:** `feature/sprint-86-multilingual-docs-shares`
**Gruppe:** B (startbar nach S84, sinnvoll nach S61 und S80)
**Status:** `done`
**Abhaengigkeiten:** S61 (PDF/Firmenprofil), S80 (Viewer-/SVG-Exporte), S84 (i18n-Core), S85 optional

---

## Ziel

Nicht nur die UI, sondern auch Kundenartefakte werden sprachfaehig:
Angebote, Werkstattpakete, Viewer-Shares und Praesentationsseiten sollen in
einer gewaehlten Sprache erzeugt werden koennen.

---

## 1. Datenmodell

Bestehende Dokument-/Share-Modelle um Sprachkontext erweitern:

- `locale_code`

Oder als JSON-Konfiguration in bereits vorhandenen Dokument-/Exportmodellen.

---

## 2. Backend

Neue oder angepasste Dateien:

- `planner-api/src/services/pdfGenerator.ts`
- `planner-api/src/routes/quotes.ts`
- `planner-api/src/routes/specificationPackages.ts`
- `planner-api/src/routes/viewerExports.ts`

Funktionen:

- PDF-Generator nimmt `locale_code`
- Exporte und Share-Payloads koennen sprachspezifisch erzeugt werden
- Viewer bekommt lokalisierte UI-Strings

---

## 3. Frontend

Neue oder angepasste Dateien:

- Export-Dialoge
- Share-Dialoge
- Angebots-/Dokumentenaktionen

Funktionen:

- Sprache fuer Export auswaehlen
- Default aus Tenant/User/Projekt uebernehmen
- sprachspezifische Vorschau oder Labeling

---

## 4. Deliverables

- locale-aware Dokumentgenerierung
- lokalisierte Share-/Viewer-Payloads
- Sprachwahl in Exportdialogen
- 8-12 Tests

---

## 5. DoD

- Angebot/PDF kann mindestens in `de` und `en` erzeugt werden
- Viewer-Share verwendet die gewaehlte Sprache
- Exportdialoge zeigen und speichern Sprachwahl
- Dokumenttexte sind nicht hart auf eine Sprache fixiert

---

## 6. Abschluss

**Implementiert:**

- Prisma erweitert um `locale_code` fuer `Quote`, `SpecificationPackage`, `PanoramaTour`, `ShareLink` inkl. Migration `20260304223000_sprint86_multilingual_docs_shares`
- Backend-Locale-Resolver `planner-api/src/services/localeSupport.ts` (de/en-Normalisierung, Fallback-Kette)
- Angebots-PDF-Flow sprachfaehig:
	- `POST /projects/:id/create-quote` persistiert `locale_code`
	- `POST /quotes/:id/export-pdf` akzeptiert `locale_code` und erzeugt PDF in `de`/`en`
	- `pdfGenerator.ts` mit lokalisierten Labels, Betrags- und Datumsdarstellung
- Spezifikationspakete sprachfaehig:
	- `POST /projects/:id/specification-packages` akzeptiert `locale_code`
	- `POST /specification-packages/:id/generate` und `GET /specification-packages/:id/download?locale_code=...`
	- `specificationPackageService.ts` lokalisiert Abschnittstitel und PDF-Covertexte
- Viewer-/Export-Payloads lokalisiert:
	- `viewerExports.ts` akzeptiert `locale_code` fuer HTML-/SVG-Exporte
	- `vectorExportService.ts` rendert lokalisierte Strings und schreibt `locale_code` in Export-Metadaten/Payload
- Share-Payloads lokalisiert:
	- Panorama-Touren und Share-Endpunkte mit `locale_code`
	- Generische Share-Links erweitern `locale_code`
- Frontend-Sprachwahl in Export-/Share-Dialogen:
	- `QuoteExportPanel` (PDF)
	- `ExportsPage` (Viewer/SVG)
	- `SpecificationPackagesPage` (Create/Generate/Download)
	- `PanoramaToursPage` (Share-Link)
	- `PublicPanoramaTourPage` nutzt Share-`locale_code` fuer sichtbare Texte

**Verifikation:**

- `planner-api`: 103/103 Testdateien, 766/766 Tests gruen
- `planner-frontend`: 12/12 Testdateien, 46/46 Tests gruen
- `planner-frontend` Build (`tsc && vite build`) gruen

