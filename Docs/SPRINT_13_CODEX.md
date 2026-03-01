# SPRINT_13_CODEX.md

## Umfang

Umsetzung Sprint 13 fuer Angebotsmanagement v1:

- Angebot aus Projekt erzeugen
- Angebotsversionen automatisch erhoehen
- Angebot abrufen
- PDF-light Export bereitstellen

## Umgesetzte Dateien

- `planner-api/src/routes/quotes.ts`
- `planner-api/src/routes/quotes.test.ts`
- `planner-api/src/services/pdfGenerator.ts`
- `planner-api/src/services/pdfGenerator.test.ts`
- `planner-api/src/index.ts`

## Ergebnis Sprint 13

Implementiert wurde:

- `POST /api/v1/projects/:id/create-quote`
  - prueft Projekt-Existenz
  - erzeugt neue Angebotsversion per Auto-Increment
  - generiert Angebotsnummer auf Basis Prefix, Jahr und laufender Version
  - uebernimmt `valid_until`, `free_text`, `footer_text` mit Defaults aus `quote_settings`
  - erzeugt `quote_items` aus uebergebenen BOM-Linien

- `GET /api/v1/quotes/:id`
  - laedt Angebot inklusive Positionen

- `POST /api/v1/quotes/:id/export-pdf`
  - liefert ein echtes PDF-light als `application/pdf`-Attachment
  - enthaelt Angebotsnummer, Version, Gueltig-bis, sichtbare Positionen und Summenblock
  - blendet Positionen mit `show_on_quote: false` aus

- `buildQuotePdf(quote)`
  - erzeugt ein leichtgewichtiges PDF ohne externe PDF-Library
  - escaped Freitext und Positionsbeschreibungen fuer sicheren Text-Output
  - nutzt Snapshot-Summen, falls vorhanden, sonst Fallback auf Positionssummen

## DoD-Status Sprint 13

- Angebotsnummer: erfuellt
- Gueltig-bis: erfuellt
- Freitext/Fusstext: erfuellt
- Angebotsversionen: erfuellt
- PDF light: erfuellt als echter Attachment-Export

## Teststatus

- `planner-api/src/routes/quotes.test.ts` gruen
- `planner-api/src/services/pdfGenerator.test.ts` gruen
- Route-Sanity zusammen mit BOM- und Pricing-Routen gruen

## Naechster Sprint

Sprint 14:

- Browser-3D-Preview
- Floor-Triangulation, Waende extrudieren, Objekt-Proxy-Meshes
