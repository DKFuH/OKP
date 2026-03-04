# Sprint 85 - Language Packs & Uebersetzungsverwaltung

**Branch:** `feature/sprint-85-language-packs`
**Gruppe:** B (startbar nach S84)
**Status:** `planned`
**Abhaengigkeiten:** S84 (i18n-Core)

---

## Ziel

Sprachen sollen nicht nur hart im Core liegen, sondern als verwaltbare
Sprachpakete erweiterbar werden. Das erlaubt spaetere Fachwort-Varianten,
Branchensprache und optionale weitere Locales ohne Core-Fork.

Leitidee: verwaltbare Sprachpakete und tenant-spezifische Terminologie.

---

## 1. Architektur

Hybrid:

- Core kennt Basissprachen `de` und `en`
- weitere Sprachpakete koennen als verwaltete Ressourcen geladen werden

Optional spaeter pluginfaehig, V1 aber noch ohne eigenes Plugin noetig.

---

## 2. Datenmodell

Ans Ende von `planner-api/prisma/schema.prisma` anhaengen:

```prisma
model LanguagePack {
  id             String   @id @default(uuid())
  tenant_id      String?
  locale_code    String   @db.VarChar(10)
  name           String   @db.VarChar(120)
  scope          String   @db.VarChar(20)
  messages_json  Json
  enabled        Boolean  @default(true)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@index([locale_code, enabled])
  @@map("language_packs")
}
```

`scope` V1:

- `system`
- `tenant`

---

## 3. Backend

Neue Dateien:

- `planner-api/src/routes/languagePacks.ts`
- `planner-api/src/services/languagePackResolver.ts`

Endpoints:

- `GET /language-packs`
- `POST /language-packs`
- `PATCH /language-packs/:id`
- `DELETE /language-packs/:id`

Resolver:

- Core-Messages mit optionalen Packs mergen
- Tenant-spezifische Overrides aufloesen

---

## 4. Frontend

Neue oder angepasste Dateien:

- `planner-frontend/src/api/languagePacks.ts`
- `planner-frontend/src/pages/LanguagePacksPage.tsx`

Funktionen:

- aktive Sprachpakete anzeigen
- neue Sprachpakete importieren oder bearbeiten
- Tenant-spezifische Terminologie verwalten

---

## 5. Deliverables

- `LanguagePack` plus Migration
- Resolver fuer system/tenant Sprachpakete
- CRUD fuer Sprachpakete
- Verwaltungsseite im Frontend
- 8-12 Tests

---

## 6. DoD

- Sprachpakete koennen verwaltet werden
- Tenant-Overrides greifen ueber Core-Keys
- neue Locales lassen sich ohne Codefork aktivieren
- fehlerhafte Packs werden sauber validiert
