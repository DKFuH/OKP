# Sprint 105 - Automatische Wandtransparenz und Dollhouse-Regel

**Branch:** `feature/sprint-105-auto-wall-transparency-dollhouse`
**Gruppe:** A
**Status:** `done`
**Abhaengigkeiten:** S88 (Visibility), S74 (Split-View), S77 (Tageslicht/Kamera)

## Ziel

In der 3D-Ansicht soll bei kamerabasierten Innenansichten die Frontwand automatisch transparent oder ausgeblendet werden, um den Raum nutzbar als "Dollhouse" darzustellen.

Leitidee: camera-aware visibility automation.

---

## 1. Scope

In Scope:

- automatische Frontwand-Erkennung anhand Kamera-Richtung/Position
- weiche Transparenzstufen statt hartem Pop-In
- per Projekt/Benutzer schaltbare Auto-Dollhouse-Regel
- Konfliktfreie Kombination mit manueller Sichtbarkeit

Nicht in Scope:

- physikalisch exakte Sichtstrahl-Simulation
- ML-basierte Szenenklassifikation

---

## 2. Architektur

Frontend:

- Kamera-Observer in `Preview3D`
- Visibility-Resolver: `manual override > auto rule`
- smooth alpha transitions fuer Wandmaterialien

Backend:

- optionale Speicherung von Auto-Visibility-Settings (`visibility presets`)
- keine Pflicht fuer neue schwere Geometrie-Services

---

## 3. API und Konfiguration

Geplante Endpunkte/Erweiterungen:

- `PATCH /projects/:id/visibility/auto-dollhouse`
- `GET /projects/:id/visibility/auto-dollhouse`

Konfigfelder:

- `enabled`
- `alpha_front_walls`
- `distance_threshold`
- `angle_threshold_deg`

---

## 4. UX-Anforderungen

- kein Flackern bei kleinen Kamera-Bewegungen
- klarer Toggle im Visibility-Panel
- Statusindikator, ob Auto- oder Manual-Mode aktiv ist

---

## 5. Tests

Mindestens:

- 6+ Unit-Tests fuer Regel-Resolver
- 6+ Frontend-Interaktionstests fuer Kamerawechsel
- 3+ Regressionstests fuer bestehende Visibility-Pfade

---

## 6. DoD

- Auto-Dollhouse funktioniert in Standard-3D und Split-View
- manuelle Sichtbarkeit kann Auto-Regel uebersteuern
- kein signifikanter FPS-Einbruch in typischen Projekten
- Tests fuer Rule-Resolver und UI gruen

---

## 7. Nicht Teil von Sprint 105

- vollautomatischer Grundriss-Schnittgenerator
- individuelle Transparenz-Shader pro Materialklasse

---

## 8. Implementierungsnotiz

- Backend-Endpunkte umgesetzt: `GET/PATCH /projects/:id/visibility/auto-dollhouse`
- Persistenz umgesetzt in `project_environments.config_json.auto_dollhouse` (tenant-scope geprueft)
- Visibility-Panel erweitert um Toggle, Parameter und Statusindikator (Auto/Manuell)
- Kamera-basierte Frontwand-Transparenz in `Preview3D` mit weicher Alpha-Interpolation umgesetzt
- Regel `manual override > auto rule` umgesetzt: manuell ausgeblendete Waende bleiben ausgeblendet
- Testabdeckung ergaenzt: 8 Route-Tests backend, 7 Resolver-Unit-Tests frontend
