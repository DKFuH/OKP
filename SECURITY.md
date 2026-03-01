# Sicherheitsrichtlinie

## Unterstützte Versionen

| Version | Unterstützt |
|---------|-------------|
| `main`  | Ja          |

Ältere Branches erhalten keine Sicherheitsupdates.

## Sicherheitslücke melden

**Bitte melde Sicherheitslücken nicht öffentlich als GitHub-Issue.**

Sende stattdessen eine vertrauliche E-Mail an:

**github@danielklas.de**

Bitte gib folgende Informationen an:

- Beschreibung der Schwachstelle
- Betroffene Komponente / Datei / Endpunkt
- Schritte zur Reproduktion
- Mögliche Auswirkungen
- Ggf. ein Proof-of-Concept (kein aktiver Exploit)

## Reaktionszeit

| Schritt                        | Ziel        |
|--------------------------------|-------------|
| Eingangsbestätigung            | ≤ 48 Stunden |
| Erstbewertung                  | ≤ 5 Werktage |
| Fix / Workaround               | nach Schweregrad |
| Öffentliche Bekanntmachung     | nach Abstimmung mit dem Melder |

## Umfang

In Scope:
- `planner-api` – REST-Endpunkte, Authentifizierung, Datenbankzugriffe
- `planner-frontend` – XSS, CSRF, unsichere Eingaben
- `shared-schemas` – fehlerhafte Validierung mit Zod
- `interop-cad` / `interop-sketchup` – Datei-Parser (z. B. Path Traversal, DoS durch bösartige Dateien)

Out of Scope:
- Abhängigkeiten in `node_modules` (bitte direkt beim jeweiligen Paket melden)
- Theoretische Schwachstellen ohne reproduzierbaren Nachweis
- Social Engineering

## Danksagung

Wer eine Sicherheitslücke verantwortungsvoll meldet, wird nach Absprache in der Release-Note namentlich erwähnt.

## Lizenz

Diese Richtlinie steht unter der [Apache License 2.0](LICENSE).
