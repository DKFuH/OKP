# YAKDS
Yust another Kitchen Design Software (Buissnes)

## Environment Variables

Für das Backend (`planner-api`) sind die relevanten Variablen in `planner-api/.env.example` dokumentiert.

- `DATABASE_URL` – PostgreSQL-Connection-String
- `PORT` – API-Port (Default: `3000`)
- `HOST` – API-Bind-Adresse (Default: `0.0.0.0`)
- `FRONTEND_URL` – erlaubte Frontend-Origin für CORS
- `LEAD_RETENTION_DAYS` – Löschfenster für nicht-promotete Leads mit Status `new` (Default: `30`)
