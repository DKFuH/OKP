# Sprint 89 - Browser-Favoriten, Ordner & Kollektionen

**Branch:** `feature/sprint-89-browser-favorites-folders`
**Gruppe:** B (startbar nach S75 und S78)
**Status:** `planned`
**Abhaengigkeiten:** S75 (Asset-Library), S78 (Materials)

---

## Ziel

Katalog-, Asset- und Materialbrowser sollen in grossen Bibliotheken skalieren:
Favoriten, Unterordner, Kollektionen, gespeicherte Filter und bessere Preview-
Ordnungslogik fuer den taeglichen Einsatz.

Leitidee: Favoriten, Unterordner, Filter und bessere Vorschau fuer grosse Bibliotheken.

---

## 1. Architektur

Plugin-nah, aber auf bestehenden Plugin-Browsern aufsetzend:

- Erweiterung von `asset-library`
- Erweiterung von `materials`

Keine neue Core-Phase, sondern Browser-Qualitaet ueber vorhandene Plugins.

---

## 2. Datenmodell

Neue oder angepasste Modelle:

- `favorite`
- `folder_id`
- `collection`
- `saved_filter_json`

Moegliche neue Tabellen:

```prisma
model LibraryFolder {
  id          String   @id @default(uuid())
  tenant_id   String
  kind        String   @db.VarChar(40)
  name        String   @db.VarChar(120)
  parent_id   String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@index([tenant_id, kind])
  @@map("library_folders")
}
```

---

## 3. Frontend

Neue oder angepasste Dateien:

- `AssetBrowser.tsx`
- `MaterialBrowser.tsx`
- optionale `LibraryFoldersPanel.tsx`

Funktionen:

- Favoriten markieren
- Ordner/Subfolder
- gespeicherte Filter
- Sortierung nach Nutzung/Aktualitaet/Favoriten
- groessere Previews und kompakter Listenmodus

---

## 4. Deliverables

- Favoriten und Ordnerlogik
- Saved Filters
- Browser-UX fuer grosse Bibliotheken
- 8-12 Tests

---

## 5. DoD

- Nutzer kann Assets/Materialien favorisieren
- Bibliothekseintraege koennen in Ordnern organisiert werden
- gespeicherte Filter und Kollektionen beschleunigen die Suche
- Browser bleibt auch bei grossen Datenmengen bedienbar
