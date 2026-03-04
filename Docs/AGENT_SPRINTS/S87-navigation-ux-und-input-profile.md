# Sprint 87 - Navigation-UX & Input-Profile

**Branch:** `feature/sprint-87-navigation-input-profiles`
**Gruppe:** A (startbar nach S74)
**Status:** `planned`
**Abhaengigkeiten:** S74 (Split-View), S76 (Presentation optional)

---

## Ziel

Die Navigation in 2D und 3D soll sich professioneller und CAD-naher anfuehlen:
Middle-Mouse-Pan, Touchpad-Gesten, invertierbare Achsen, konfigurierbare
Navigationsprofile und konsistente Steuerung zwischen Editor, 3D und Viewer.

Leitidee: professionelle Navigation mit Pan, Touchpad-Profilen und konsistenter 2D/3D-Steuerung.

---

## 1. Datenmodell / Persistenz

User- oder Tenant-Settings erweitern:

- `navigation_profile`
- `invert_y_axis`
- `middle_mouse_pan`
- `touchpad_mode`
- `zoom_direction`

V1-Profile:

- `cad`
- `presentation`
- `trackpad`

---

## 2. Frontend

Neue oder angepasste Dateien:

- `planner-frontend/src/components/editor/NavigationSettingsPanel.tsx`
- Anpassungen in `CanvasArea.tsx`, `Preview3D.tsx`, `Editor.tsx`

Funktionen:

- Pan per mittlerer Maustaste
- Touchpad-Zoom/Pan sauber behandeln
- invertierbare Up/Down- oder Orbit-Achse
- Zoom-Geschwindigkeit und Richtung
- einheitliche Shortcuts fuer `2D`, `Split`, `3D`

---

## 3. Backend

Nur falls Settings serverseitig persistiert werden:

- `GET /user/navigation-settings`
- `PUT /user/navigation-settings`

---

## 4. Deliverables

- Navigation-Profile
- Settings-Panel fuer Eingabe/Navigation
- 2D-/3D-Verhalten vereinheitlicht
- 8-12 Tests

---

## 5. DoD

- Middle-Mouse-Pan funktioniert in Plan und 3D
- Touchpad-Nutzung fuehlt sich nicht wie ein Sonderfall an
- Nutzer kann mindestens ein CAD-nahes Profil aktivieren
- Navigationseinstellungen bleiben persistent
