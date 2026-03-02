# PHASE_5_DOD_AND_EXECUTION_PLAN.md

Stand: 2026-03-02

---

## 1) Executive Summary: Phase-5 Definition of Done (DoD)

- **Auftragssteuerung End-to-End:** Aus einem bestätigten Angebot entsteht ein Produktionsauftrag mit unveränderlichem BOM-Snapshot; der gesamte Lebenszyklus (Draft → Montage) ist protokolliert.
- **Mobile Feldarbeit:** Aufmaß und Abnahme erfolgen offline-fähig über eine PWA; Protokolle werden automatisch als PDF-Dokumente archiviert.
- **ERP/Lieferantenanbindung:** Mindestens 1 ERP-System (REST-basiert) synchronisiert Auftragsdaten bidirektional; Lieferantenbestellungen werden automatisch ausgelöst.
- **Erweitertes Reporting:** Konfigurierbare Reports, Drill-Down-KPIs und geplanter Report-Versand per E-Mail sind produktiv.
- **Compliance & Enterprise-Betrieb:** DSGVO-Löschworkflow, SSO (SAML 2.0), granulares RBAC und SLA-Dashboard sind tenant-sicher und auditierbar.
- **Testabdeckung:** Alle neuen Sprints 35–39 erreichen mindestens 80 % Abdeckung durch Unit- und Integrationstests.

### Globales DoD für Phase 5

1. **Produktionsauftrag produktiv:** Angebot → Auftrag in 1 Klick; BOM eingefroren; Statusprotokoll vollständig.
2. **Mobile Aufmaß produktiv:** PWA offline nutzbar; Fotos, Maße, Notizen werden synchronisiert; PDF abrufbar.
3. **Montage-Checkliste produktiv:** Positionen abhakbar, Mängelfoto-Upload, automatische Abnahme-PDF.
4. **ERP-Sync produktiv:** Konfigurierbare ERP-Verbindung; Sync-Log; Lieferanten-Bestellauslösung.
5. **Report-Builder produktiv:** Min. 5 Dimensions-/Metrikkombinationen, gespeicherte Vorlagen, Export PDF/Excel.
6. **DSGVO-Compliance produktiv:** Right-to-be-Forgotten auditierbar; Datenexport für Kontakte; Audit-Log abrufbar.
7. **SSO produktiv:** Test-IdP per SAML 2.0 erfolgreich; Fallback auf lokale Accounts gesichert.
8. **RBAC produktiv:** Branch-level-Zugriffssteuerung aktiv; Role-Assignment-UI in Admin-Bereich.
9. **SLA-Dashboard produktiv:** Latenz-Heatmap, Fehlerrate, Uptime-Indikatoren sichtbar; Schwellenwert-Alerts konfigurierbar.

---

## 2) Ausgangslage und Abhängigkeiten

### Technische Ausgangslage (nach Sprint 34)

- `Sprint 13`: Angebotslogik (`quotes`) vorhanden.
- `Sprint 23`: Multi-Tenant + BI-Light vorhanden.
- `Sprint 25`: Projektstatusmodell, Kanban, Gantt.
- `Sprint 26`: Dokumentenmanagement (S3-kompatibles Storage).
- `Sprint 28`: DashboardConfig + KPI-Widgets.
- `Sprint 30`: Globale Suche, Export, Notifications, Auto-Backup.
- `Sprint 34`: Workspace-Layout, Areas/Alternatives, Onboarding-Wizard.

### Verbindliche Abhängigkeiten für Phase 5

- `tenant_id` bleibt in allen neuen Entitäten und Endpunkten verpflichtend.
- ERP-Connector nutzt bestehende `erp_connections`-Tabelle als Konfigurationsquelle.
- Mobile PWA baut auf bestehender Frontend-Auth (JWT) auf; Offline-Token-Handling gesondert definiert.
- RBAC erweitert bestehende `tenant_id`-Middleware um `branch_id` + `action` + `resource`.
- Audit-Log nutzt bestehende Notification-Hook-Infrastruktur als Eventquelle.

---

## 3) Sprint-Backlog (35–39)

### Sprint 35 – Auftragssteuerung & Produktionsübergabe

- **Priorität:** Muss (P1)
- **Ziel:** Aus einem bestätigten Angebot einen Produktionsauftrag erzeugen und verfolgen.

**Neue Entity (`ProductionOrder`)**

```ts
interface ProductionOrder {
  id: string;
  tenant_id: string;
  project_id: string;
  quote_id: string;
  order_number: string;
  status: 'draft' | 'confirmed' | 'in_production' | 'shipped' | 'installed' | 'cancelled';
  bom_snapshot: BomItem[];
  supplier_reference: string | null;
  planned_delivery: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductionOrderStatusLog {
  id: string;
  order_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  changed_at: string;
  note: string | null;
}
```

**API-Contracts**

```http
POST   /projects/:id/production-orders
GET    /projects/:id/production-orders
GET    /production-orders/:id
PATCH  /production-orders/:id/status
GET    /production-orders/:id/status-log
GET    /production-orders/export-csv?tenant_id=?&status=?
```

**DoD (Sprint 35)**

- Angebot → Produktionsauftrag: BOM-Snapshot eingefroren, Auftragsnummer generiert.
- Statuswechsel werden mit Benutzer + Zeitstempel protokolliert.
- CSV-Export der Auftragsliste funktioniert tenant-sicher.
- 10 Tests decken Lifecycle (Anlage, Statuswechsel, BOM-Unveränderlichkeit, Rechte) ab.

**Umsetzungsreihenfolge**

1. DB-Tabellen `production_orders` + `production_order_status_logs` + Migration.
2. API-Routen (CRUD + Status-Patch + Status-Log) mit Zod-Validierung und Tenant-Guard.
3. BOM-Snapshot-Logik: JSON-Einfrierung bei Confirmation.
4. CSV-Export für Auftragsliste.
5. Frontend-Auftragsübersicht: Liste, Filter, Status-Badge, 1-Klick-Promotion aus Angebot.

---

### Sprint 36 – Mobile Aufmaß & Baustellenprotokoll

- **Priorität:** Muss (P1)
- **Ziel:** Offline-fähiger mobiler Workflow für Aufmaß und Montage-Abnahme.

**Neue Entitäten**

```ts
interface SurveyRecord {
  id: string;
  project_id: string;
  tenant_id: string;
  surveyed_by: string;
  surveyed_at: string;
  rooms: SurveyRoom[];
  photos: SurveyPhoto[];
  notes: string | null;
  pdf_document_id: string | null;
}

interface InstallationChecklist {
  id: string;
  project_id: string;
  production_order_id: string;
  tenant_id: string;
  items: ChecklistItem[];
  defects: DefectRecord[];
  completed_at: string | null;
  pdf_document_id: string | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
}

interface DefectRecord {
  id: string;
  description: string;
  photo_id: string | null;
  severity: 'minor' | 'major' | 'critical';
  resolved: boolean;
}
```

**API-Contracts**

```http
POST  /projects/:id/survey-records
GET   /projects/:id/survey-records
GET   /survey-records/:id/pdf
POST  /projects/:id/installation-checklists
GET   /projects/:id/installation-checklists
PATCH /installation-checklists/:id/items/:itemId
POST  /installation-checklists/:id/defects
GET   /installation-checklists/:id/pdf
```

**DoD (Sprint 36)**

- Aufmaß offline erfassen und synchronisieren (Service-Worker-basiert).
- Fotos werden in S3-kompatibler Storage abgelegt und an `Document`-Entity angehängt.
- PDF für Aufmaß- und Abnahmeprotokoll automatisch generiert und in Dokumentenliste sichtbar.
- Montage-Checkliste vollständig abhakbar inkl. Mängeldokumentation.
- 8 Tests decken Offline-Sync-Logik, PDF-Generierung und Checklist-Workflow ab.

**Umsetzungsreihenfolge**

1. DB-Tabellen + Migrationen für `survey_records`, `installation_checklists`, `checklist_items`, `defect_records`.
2. API-Routen mit Tenant-Guard und Zod-Validierung.
3. PDF-Generator (Aufmaßprotokoll + Abnahmeprotokoll) mit Auto-Attach an `documents`.
4. Service-Worker-Strategie für Offline-Fähigkeit + Konfliktauflösung bei Re-Sync.
5. Mobile-optimiertes Frontend (`/mobile`-Route): Aufmaß-Formular, Checklist-View, Foto-Upload.

---

### Sprint 37 – ERP-Anbindung & Lieferantenportal

- **Priorität:** Muss (P1)
- **Ziel:** Bidirektionale ERP-Kopplung und strukturiertes Lieferanten-Bestellportal.

**Neue Entitäten**

```ts
interface ErpConnection {
  id: string;
  tenant_id: string;
  name: string;
  base_url: string;
  auth_type: 'api_key' | 'oauth2' | 'basic';
  field_mapping: Record<string, string>;
  is_active: boolean;
  last_synced_at: string | null;
}

interface ErpSyncLog {
  id: string;
  connection_id: string;
  direction: 'push' | 'pull';
  entity_type: string;
  entity_id: string;
  status: 'success' | 'error';
  error_message: string | null;
  synced_at: string;
}

interface SupplierOrder {
  id: string;
  tenant_id: string;
  production_order_id: string;
  supplier_id: string;
  items: SupplierOrderItem[];
  status: 'draft' | 'sent' | 'confirmed' | 'delivered';
  sent_at: string | null;
  confirmed_at: string | null;
}
```

**API-Contracts**

```http
POST /tenants/:id/erp-connections
GET  /tenants/:id/erp-connections
PUT  /erp-connections/:id
POST /erp-connections/:id/sync
GET  /erp-connections/:id/sync-log
POST /production-orders/:id/supplier-order
GET  /supplier-orders/:id
PATCH /supplier-orders/:id/status
```

**DoD (Sprint 37)**

- 1 ERP-Verbindung konfigurieren, testen und Sync-Log abrufen.
- Lieferantenbestellung aus Produktionsauftrag erzeugen und versenden.
- Statusrückmeldung vom Lieferanten aktualisiert `SupplierOrder.status`.
- Sync-Log zeigt Erfolg/Fehler pro Entität.
- 10 Tests decken Verbindungsaufbau, Feldmapping, Sync-Fehlerbehandlung und Bestellworkflow ab.

---

### Sprint 38 – Erweiterte Analytics & individuelle Reports

- **Priorität:** Soll (P1)
- **Ziel:** Report-Builder, Drill-Down-KPIs und geplanter Report-Versand.

**Neue Entitäten**

```ts
interface ReportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  dimensions: string[];
  metrics: string[];
  filters: ReportFilter[];
  created_by: string;
  created_at: string;
}

interface ReportSchedule {
  id: string;
  template_id: string;
  recipient_emails: string[];
  cron_expression: string;
  format: 'pdf' | 'excel';
  last_sent_at: string | null;
}

interface ReportResult {
  template_id: string;
  generated_at: string;
  rows: Record<string, unknown>[];
  totals: Record<string, number>;
}
```

**API-Contracts**

```http
GET  /reports/builder?dimensions=…&metrics=…&period=…&branch_id=…
POST /reports/templates
GET  /reports/templates
PUT  /reports/templates/:id
DELETE /reports/templates/:id
POST /reports/templates/:id/run
GET  /reports/templates/:id/export?format=pdf|excel
POST /reports/schedules
GET  /reports/schedules
DELETE /reports/schedules/:id
GET  /kpis/funnel?period=month
GET  /kpis/revenue-heatmap?year=…
```

**Standard-Auswertungen (MVP in Sprint 38)**

- `revenue_by_period` – Umsatz nach Periode/Verkäufer/Branch
- `lead_to_order_funnel` – Trichteranalyse Lead → Angebot → Auftrag → Montage
- `top_articles` – Umsatzstärkste Artikel/Hersteller
- `production_throughput` – Durchlaufzeiten Auftrag → Lieferung
- `customer_lifetime_value` – Umsatz pro Kontakt über Zeit

**DoD (Sprint 38)**

- Report-Builder erzeugt Tabellen/Diagramme aus min. 5 Dimensions-/Metrikkombinationen.
- Gespeicherte Vorlagen werden geladen und reproduzierbar ausgeführt.
- PDF- und Excel-Export validiert (Diagramme, Tabellen, Seitenwechsel).
- Geplante Reports werden per E-Mail versendet (Cron-basiert).
- 8 Tests decken Builder-Logik, Vorlage-Persistenz und Export-Pipeline ab.

---

### Sprint 39 – Compliance, Plattformhärtung & SLA-Management

- **Priorität:** Muss (P1)
- **Ziel:** DSGVO-Werkzeuge, SSO, granulares RBAC und SLA-Dashboard für Produktivbetrieb.

**Neue Entitäten**

```ts
interface SsoConfig {
  id: string;
  tenant_id: string;
  protocol: 'saml2' | 'oidc';
  idp_metadata_url: string;
  entity_id: string;
  acs_url: string;
  attribute_mapping: Record<string, string>;
  is_active: boolean;
}

interface AuditEntry {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload_hash: string;
  created_at: string;
}

interface RoleAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  branch_id: string | null;
  role: 'admin' | 'planner' | 'sales' | 'viewer';
  granted_by: string;
  granted_at: string;
}

interface SlaSnapshot {
  tenant_id: string;
  measured_at: string;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate_pct: number;
  uptime_pct: number;
}
```

**API-Contracts**

```http
POST /tenants/:id/sso-config
GET  /tenants/:id/sso-config
PUT  /tenants/:id/sso-config
GET  /tenants/:id/audit-log?from=…&to=…&action=…
POST /tenants/:id/gdpr/delete-contact
POST /tenants/:id/gdpr/export-contact
GET  /tenants/:id/role-assignments
POST /tenants/:id/role-assignments
DELETE /tenants/:id/role-assignments/:id
GET  /tenants/:id/sla-snapshots?period=7d|30d
GET  /tenants/:id/sla-snapshots/latest
```

**DoD (Sprint 39)**

- SSO mit Test-IdP (SAML 2.0) erfolgreich; Session-Validierung tenant-sicher; Fallback auf lokale Accounts.
- DSGVO-Löschworkflow kaskadiert über alle Entitäten; Audit-Entry unveränderlich angelegt.
- Datenexport für Kontakte liefert vollständige, DSGVO-konforme JSON-Datei.
- RBAC regelt Branch-level-Zugriff; UI zeigt Role-Assignments in Admin-Bereich.
- SLA-Dashboard zeigt Latenz-Heatmap, Fehlerrate und Uptime; Schwellenwert-Alert konfigurierbar.
- 12 Tests decken SSO-Flow, RBAC-Zugriffslogik, DSGVO-Kaskade und SLA-Snapshot ab.

---

## 4) Übersichtstabelle Phase 5

| Sprint | Thema | Schlüsselobjekte | API-Highlights |
|--------|-------|-----------------|----------------|
| 35 | Auftragssteuerung | `ProductionOrder`, `StatusLog` | `/projects/:id/production-orders`, `/production-orders/:id/status` |
| 36 | Mobile Aufmaß | `SurveyRecord`, `InstallationChecklist` | `/projects/:id/survey-records`, `/installation-checklists/:id/pdf` |
| 37 | ERP-Anbindung | `ErpConnection`, `SupplierOrder` | `/erp-connections/:id/sync`, `/production-orders/:id/supplier-order` |
| 38 | Analytics & Reports | `ReportTemplate`, `ReportSchedule` | `/reports/builder`, `/reports/templates/:id/export` |
| 39 | Compliance & SLA | `SsoConfig`, `AuditEntry`, `RoleAssignment`, `SlaSnapshot` | `/tenants/:id/sso-config`, `/tenants/:id/gdpr/*`, `/tenants/:id/sla-snapshots` |

---

## 5) Reihenfolgeplan (5 Wochen)

### Woche 1 (Sprint 35)

- `ProductionOrder`-Schema + Migration, API-Routen, BOM-Snapshot-Logik, CSV-Export, Frontend-Auftragsübersicht.

### Woche 2 (Sprint 36)

- `SurveyRecord`- und `InstallationChecklist`-Schema, API-Routen, PDF-Generator, Service-Worker-Strategie, Mobile-Frontend.

### Woche 3 (Sprint 37)

- `ErpConnection`- und `SupplierOrder`-Schema, Connector-Framework, Sync-Log, Lieferantenbestellworkflow.

### Woche 4 (Sprint 38)

- `ReportTemplate`/`ReportSchedule`-Schema, Report-Builder-API, Standard-Auswertungen, PDF/Excel-Export, Cron-basierter Versand.

### Woche 5 (Sprint 39)

- `SsoConfig`- und RBAC-Schema, SAML-2.0-Integration, DSGVO-Kaskaden, Audit-Log, SLA-Snapshot-Collection, Admin-UI.

---

## 6) Risiken und offene Architekturfragen

1. **ERP-Heterogenität:** Verschiedene ERP-Systeme (SAP, Microsoft Dynamics, Lexware, …) erfordern unterschiedliche Authentifizierungs- und Feldmapping-Strategien. Der generische Connector muss ausreichend erweiterbar sein.
2. **Offline-Konflikte:** Wenn Aufmaß offline und gleichzeitig im Büro Änderungen vorgenommen werden, entsteht ein Merge-Konflikt. Eine klare Konfliktauflösungsstrategie (Last-Write-Wins vs. Merge-Dialog) muss vor Umsetzung festgelegt werden.
3. **PDF-Performance:** Aufmaß- und Report-PDFs mit eingebetteten Fotos und Diagrammen können groß werden. Asynchrone Generierung mit Job-Queue ist zu bevorzugen.
4. **DSGVO-Kaskade:** Löschen eines Kontakts muss alle abhängigen Entitäten (Projekte, Angebote, Aufträge, Dokumente) korrekt behandeln – entweder anonymisieren oder mitlöschen – ohne referenzielle Integrität zu verletzen.
5. **SSO-Fallback-Sicherheit:** Wenn der IdP nicht erreichbar ist, darf der Fallback auf lokale Accounts nicht zur Sicherheitslücke werden (kein Silent-Downgrade ohne Admin-Einwilligung).
6. **SLA-Datenvolumen:** Kontinuierliche Latenz-Snapshots erzeugen hohes Datenvolumen. Aggregations- und Retention-Strategie (z. B. 7 Tage Raw, 90 Tage aggregiert) muss definiert werden.

---

## 7) Meilenstein nach Phase 5

Nach Sprint 39 ist OKP eine vollständig vernetzte Branchenlösung:

- **Planung → Angebot → Auftrag → Produktion → Lieferung → Montage** End-to-End abgebildet.
- **Feldarbeit** mobil und offline unterstützt.
- **ERP/Lieferanten** bidirektional angebunden.
- **Analytics** über alle Phasen des Studio-Workflows hinweg auswertbar.
- **Enterprise-Betrieb** mit SSO, RBAC, DSGVO-Compliance und SLA-Monitoring produktionsreif.
