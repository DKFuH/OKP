# Sprint 101 - Mobile Status Client (Lead und Produktion)

**Branch:** `feature/sprint-101-mobile-status-client`
**Gruppe:** B
**Status:** `planned`
**Abhaengigkeiten:** S99 (Workflow Runtime), S100 (Masterdaten Sync), S79 (Offline/PWA Grundlagen)

## Ziel

Ein mobile-first Client soll Statusabfragen und einfache Aktionen fuer Leads und Produktionsauftraege bereitstellen, damit Vertrieb, Studio und Montage den Fortschritt unterwegs verfolgen koennen.

Leitidee: status visibility in the pocket.

---

## 1. Scope

In Scope:

- mobile Statusansicht fuer Lead/Quote/Produktion/Montage
- Timeline aus Workflow-Events
- Basisaktionen (z. B. Status bestaetigen, Rueckfrage markieren)
- Benachrichtigungen fuer relevante Statuswechsel

Nicht in Scope:

- vollstaendiger mobiler CAD-/Planungseditor
- komplexe Aufmassbearbeitung in V1

---

## 2. Zielrollen

- Verkauf: Angebotsstatus und Rueckmeldungen
- Produktion: Start/Fortschritt/Fertigmeldung
- Montage: Einsatzstatus und offene Punkte
- Backoffice: Gesamtueberblick je Auftrag

---

## 3. Architektur

Frontend:

- responsives Web-App-Frontend (PWA-first)
- optional spaetere Huelle fuer native Deployments
- Offline-Cache fuer letzte bekannte Statusdaten

Backend:

- Read-Model fuer mobile Abfragen
- Event-Stream aus Workflow- und Auftragsereignissen
- Notification-Hooks (Push/SSE/E-Mail je nach Kanal)

Sicherheit:

- tokenbasierte Auth + tenant-scoped Autorisierung
- Rollenfilter auf Projekt-/Auftragsebene
- keine Schreibaktion ohne serverseitige Berechtigungspruefung

---

## 4. API-Schnittstellen

Geplante Endpunkte:

- `GET /mobile/me/dashboard`
- `GET /mobile/orders/:id/status`
- `GET /mobile/orders/:id/timeline`
- `POST /mobile/orders/:id/actions/confirm-step`
- `POST /mobile/orders/:id/actions/report-issue`
- `GET /mobile/notifications`

Antworten optimiert fuer mobile Payloads:

- kompakte DTOs
- paginierte Timeline
- eindeutige Action-Flags je Rolle

---

## 5. UX-Flows

MVP-Flows:

- Login -> persoenliches Dashboard
- Auftrag oeffnen -> Status + Timeline
- Aktion ausfuehren -> serverseitige Bestaetigung
- Benachrichtigung oeffnen -> Deep-Link in Auftrag

UX-Prinzipien:

- grosse Touch-Targets
- klare Statusfarblogik mit Textlabels
- robuste Fehlermeldungen bei schlechter Verbindung

---

## 6. Tests

Mindestens:

- 8+ API-Tests fuer mobile Endpunkte
- 6+ Frontend-Tests fuer Kernscreens
- 4+ Security-Negativtests (rolle/tenant/projektfremd)
- E2E-Szenario "Lead -> Produktion -> Montage" auf Mobile UI

Qualitaetsziele:

- Time-to-interactive < 2.5s auf typischem Mobilgeraet
- keine kritischen Accessibility-Blocker in Kernscreens

---

## 7. DoD

- mobile Dashboard mit aktuellen Statusdaten ist verfuegbar
- Timeline zeigt nachvollziehbare Events pro Auftrag
- Kernaktionen sind rollenbasiert ausfuehrbar
- Benachrichtigungen fuer Statuswechsel funktionieren im definierten Kanal
- relevante API/UI/Security-Tests sind gruen

---

## 8. Nicht Teil von Sprint 101

- Native iOS/Android Feature-Paritaet
- CAD- oder Raumeditor auf Mobile
- Umfassendes Messaging-Center mit Chat

---

## 9. Open-Source-Compliance

- Orientierung an ERP-Mobile-Mustern ist erlaubt.
- Keine Uebernahme fremder UI-Assets, Texte oder geschuetzter Screens.
- Umsetzung erfolgt mit eigener Designsprache und eigenen Components.
