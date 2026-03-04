-- CreateEnum
CREATE TYPE "AcousticVariable" AS ENUM ('spl_db', 'spl_dba', 't20_s', 'sti');

-- CreateEnum
CREATE TYPE "AcousticLayerType" AS ENUM ('source', 'receiver');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('draft', 'confirmed', 'in_production', 'ready', 'delivered', 'installed');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('pdf', 'excel', 'csv');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "FengShuiMode" AS ENUM ('west', 'east', 'both');

-- DropForeignKey
ALTER TABLE "dimensions" DROP CONSTRAINT "dimensions_room_id_fkey";

-- DropForeignKey
ALTER TABLE "layout_views" DROP CONSTRAINT "layout_views_sheet_id_fkey";

-- DropIndex
DROP INDEX "idx_catalog_articles_collection";

-- DropIndex
DROP INDEX "idx_catalog_articles_family";

-- DropIndex
DROP INDEX "idx_catalog_articles_tenant_fav";

-- AlterTable
ALTER TABLE "dimensions" ALTER COLUMN "ref_a_type" SET DATA TYPE TEXT,
ALTER COLUMN "ref_b_type" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "layout_style_presets" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nesting_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "erp_connector_id" TEXT,
ADD COLUMN     "erp_order_ref" TEXT,
ADD COLUMN     "production_order_id" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "reference_image" JSONB;

-- CreateTable
CREATE TABLE "catalog_article_properties" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "depends_on" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_article_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_article_price_tables" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "property_combination" JSONB NOT NULL,
    "price_net" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_article_price_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_article_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "article_id" TEXT NOT NULL,
    "property_values" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_article_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoustic_grids" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "variable" "AcousticVariable" NOT NULL DEFAULT 'spl_db',
    "resolution_mm" INTEGER NOT NULL DEFAULT 500,
    "origin_x_mm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "origin_y_mm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slice_height_mm" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "grid_cols" INTEGER NOT NULL,
    "grid_rows" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "min_value" DOUBLE PRECISION NOT NULL,
    "max_value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acoustic_grids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoustic_layers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "layer_type" "AcousticLayerType" NOT NULL,
    "object_refs" JSONB NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acoustic_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "quote_id" TEXT,
    "bom_snapshot" JSONB NOT NULL DEFAULT '{}',
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'draft',
    "due_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "frozen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_events" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "user_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_surveys" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "measurements" JSONB NOT NULL DEFAULT '{}',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installation_checklists" (
    "id" TEXT NOT NULL,
    "production_order_id" TEXT,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Abnahmeprotokoll',
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installation_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "photo_url" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_connectors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "auth_config" JSONB NOT NULL DEFAULT '{}',
    "field_mapping" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "dimensions" JSONB NOT NULL DEFAULT '[]',
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "report_definition_id" TEXT NOT NULL,
    "cron_expression" VARCHAR(100) NOT NULL,
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "format" "ReportFormat" NOT NULL DEFAULT 'pdf',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "report_name" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_url" TEXT,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_deletion_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "user_id" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "performed_by" TEXT NOT NULL,
    "scope_json" JSONB NOT NULL DEFAULT '[]',
    "result_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "gdpr_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_providers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "sso_url" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "endpoint" VARCHAR(200) NOT NULL,
    "p50_ms" DOUBLE PRECISION NOT NULL,
    "p95_ms" DOUBLE PRECISION NOT NULL,
    "uptime_pct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "sample_size" INTEGER NOT NULL DEFAULT 0,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fengshui_analyses" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mode" "FengShuiMode" NOT NULL DEFAULT 'both',
    "entry_refs" JSONB,
    "compass_deg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bounds_mm" JSONB NOT NULL,
    "zones_geojson" JSONB NOT NULL,
    "findings" JSONB NOT NULL,
    "score_total" INTEGER NOT NULL DEFAULT 0,
    "score_west" INTEGER NOT NULL DEFAULT 0,
    "score_east" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fengshui_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_library_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "source_format" VARCHAR(20) NOT NULL,
    "file_url" TEXT NOT NULL,
    "preview_url" TEXT,
    "bbox_json" JSONB NOT NULL DEFAULT '{}',
    "default_scale_json" JSONB NOT NULL DEFAULT '{}',
    "tags_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_article_properties_article_id_idx" ON "catalog_article_properties"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_article_properties_article_id_key_key" ON "catalog_article_properties"("article_id", "key");

-- CreateIndex
CREATE INDEX "catalog_article_price_tables_article_id_idx" ON "catalog_article_price_tables"("article_id");

-- CreateIndex
CREATE INDEX "user_article_profiles_user_id_idx" ON "user_article_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_article_profiles_article_id_idx" ON "user_article_profiles"("article_id");

-- CreateIndex
CREATE INDEX "acoustic_grids_project_id_idx" ON "acoustic_grids"("project_id");

-- CreateIndex
CREATE INDEX "acoustic_layers_project_id_idx" ON "acoustic_layers"("project_id");

-- CreateIndex
CREATE INDEX "production_orders_project_id_idx" ON "production_orders"("project_id");

-- CreateIndex
CREATE INDEX "production_orders_tenant_id_idx" ON "production_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "production_order_events_production_order_id_idx" ON "production_order_events"("production_order_id");

-- CreateIndex
CREATE INDEX "site_surveys_project_id_idx" ON "site_surveys"("project_id");

-- CreateIndex
CREATE INDEX "site_surveys_tenant_id_idx" ON "site_surveys"("tenant_id");

-- CreateIndex
CREATE INDEX "installation_checklists_project_id_idx" ON "installation_checklists"("project_id");

-- CreateIndex
CREATE INDEX "installation_checklists_production_order_id_idx" ON "installation_checklists"("production_order_id");

-- CreateIndex
CREATE INDEX "checklist_items_checklist_id_idx" ON "checklist_items"("checklist_id");

-- CreateIndex
CREATE INDEX "erp_connectors_tenant_id_idx" ON "erp_connectors"("tenant_id");

-- CreateIndex
CREATE INDEX "report_definitions_tenant_id_idx" ON "report_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "report_schedules_report_definition_id_idx" ON "report_schedules"("report_definition_id");

-- CreateIndex
CREATE INDEX "report_runs_tenant_id_generated_at_idx" ON "report_runs"("tenant_id", "generated_at");

-- CreateIndex
CREATE INDEX "gdpr_deletion_requests_tenant_id_idx" ON "gdpr_deletion_requests"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_providers_tenant_id_key" ON "sso_providers"("tenant_id");

-- CreateIndex
CREATE INDEX "role_permissions_tenant_id_role_idx" ON "role_permissions"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenant_id_role_resource_action_branch_id_key" ON "role_permissions"("tenant_id", "role", "resource", "action", "branch_id");

-- CreateIndex
CREATE INDEX "sla_snapshots_endpoint_recorded_at_idx" ON "sla_snapshots"("endpoint", "recorded_at");

-- CreateIndex
CREATE INDEX "fengshui_analyses_project_id_idx" ON "fengshui_analyses"("project_id");

-- CreateIndex
CREATE INDEX "asset_library_items_tenant_id_category_idx" ON "asset_library_items"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "purchase_orders_production_order_id_idx" ON "purchase_orders"("production_order_id");

-- AddForeignKey
ALTER TABLE "layout_views" ADD CONSTRAINT "layout_views_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "layout_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_article_properties" ADD CONSTRAINT "catalog_article_properties_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "catalog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_article_price_tables" ADD CONSTRAINT "catalog_article_price_tables_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "catalog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_events" ADD CONSTRAINT "production_order_events_production_order_id_fkey" FOREIGN KEY ("production_order_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_surveys" ADD CONSTRAINT "site_surveys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "installation_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "report_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
