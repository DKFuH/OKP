-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "ProjectWorkflowStatus" AS ENUM ('lead', 'planning', 'quoted', 'contract', 'production', 'installed', 'archived');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'qualified', 'quoted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "BlockBasis" AS ENUM ('purchase_price', 'sell_price', 'points');

-- CreateEnum
CREATE TYPE "CatalogItemType" AS ENUM ('base_cabinet', 'wall_cabinet', 'tall_cabinet', 'trim', 'worktop', 'appliance', 'accessory');

-- CreateEnum
CREATE TYPE "ExtraCostType" AS ENUM ('freight', 'assembly', 'other');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "RenderJobStatus" AS ENUM ('queued', 'assigned', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "RenderNodeStatus" AS ENUM ('active', 'offline');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('queued', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('quote_pdf', 'render_image', 'cad_import', 'email', 'contract', 'other');

-- CreateEnum
CREATE TYPE "DocumentSourceKind" AS ENUM ('manual_upload', 'quote_export', 'render_job', 'import_job');

-- CreateEnum
CREATE TYPE "BackupScope" AS ENUM ('daily_snapshot', 'manual_snapshot');

-- CreateEnum
CREATE TYPE "BackupSnapshotStatus" AS ENUM ('done', 'failed');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('project_status_changed', 'document_uploaded', 'document_deleted', 'quote_created', 'custom');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('queued', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('base_cabinet', 'wall_cabinet', 'tall_cabinet', 'worktop', 'plinth', 'accessory', 'trim', 'appliance');

-- CreateEnum
CREATE TYPE "GeneratedItemType" AS ENUM ('worktop', 'plinth', 'side_panel', 'handle', 'connector', 'end_cap', 'other');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('collision', 'clearance', 'ergonomics', 'completeness', 'accessory');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('error', 'warning', 'hint');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('end_customer', 'architect', 'contractor');

-- CreateEnum
CREATE TYPE "ContactLeadSource" AS ENUM ('web_planner', 'showroom', 'referral', 'other');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "project_status" "ProjectWorkflowStatus" NOT NULL DEFAULT 'lead',
    "deadline" TIMESTAMP(3),
    "priority" "ProjectPriority" NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "lead_status" "LeadStatus" NOT NULL DEFAULT 'new',
    "quote_value" DOUBLE PRECISION,
    "close_probability" INTEGER,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "advisor" TEXT,
    "sales_rep" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "quote_lines" JSONB NOT NULL DEFAULT '[]',
    "pricing_groups_json" JSONB NOT NULL DEFAULT '[]',
    "macros" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ceiling_height_mm" INTEGER NOT NULL DEFAULT 2500,
    "boundary" JSONB NOT NULL,
    "ceiling_constraints" JSONB NOT NULL DEFAULT '[]',
    "openings" JSONB NOT NULL DEFAULT '[]',
    "placements" JSONB NOT NULL DEFAULT '[]',
    "worktop_schemas" JSONB NOT NULL DEFAULT '[]',
    "measure_lines" JSONB NOT NULL DEFAULT '[]',
    "section_lines" JSONB NOT NULL DEFAULT '[]',
    "comments" JSONB NOT NULL DEFAULT '[]',
    "coloring" JSONB NOT NULL DEFAULT '{"surfaces":[]}',
    "deco_objects" JSONB NOT NULL DEFAULT '[]',
    "lighting_profiles" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tax_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "catalog_item_id" TEXT NOT NULL,
    "list_price_net" DOUBLE PRECISION NOT NULL,
    "dealer_price_net" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_discount_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "pricing_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CatalogItemType" NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "depth_mm" INTEGER NOT NULL,
    "list_price_net" DOUBLE PRECISION NOT NULL,
    "dealer_price_net" DOUBLE PRECISION NOT NULL,
    "default_markup_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_group_id" TEXT NOT NULL,
    "pricing_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_settings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "quote_number_prefix" TEXT NOT NULL DEFAULT 'ANG',
    "default_validity_days" INTEGER NOT NULL DEFAULT 30,
    "default_free_text" TEXT,
    "default_footer_text" TEXT,
    "show_prices_on_quote" BOOLEAN NOT NULL DEFAULT true,
    "show_item_numbers" BOOLEAN NOT NULL DEFAULT true,
    "global_discount_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "quote_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_costs" (
    "id" TEXT NOT NULL,
    "quote_settings_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount_net" DOUBLE PRECISION NOT NULL,
    "tax_group_id" TEXT NOT NULL,
    "type" "ExtraCostType" NOT NULL,

    CONSTRAINT "extra_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "quote_number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "free_text" TEXT,
    "footer_text" TEXT,
    "price_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_net" DOUBLE PRECISION NOT NULL,
    "line_net" DOUBLE PRECISION NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL,
    "line_gross" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "show_on_quote" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_price_lists" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_adjustment_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_discounts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "discount_pct" DOUBLE PRECISION NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'project',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_line_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'manual',
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price_net" DOUBLE PRECISION NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL,
    "line_net" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_groups" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "item_selector" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_definitions" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "block_group_id" TEXT,
    "name" TEXT NOT NULL,
    "basis" "BlockBasis" NOT NULL,
    "tiers" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_conditions" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "block_definition_id" TEXT,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'gte',
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_block_evaluations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "best_block_definition_id" TEXT,
    "price_summary" JSONB NOT NULL,
    "evaluations" JSONB NOT NULL,
    "best_block" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_block_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "RenderJobStatus" NOT NULL DEFAULT 'queued',
    "scene_payload" JSONB,
    "worker_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_nodes" (
    "id" TEXT NOT NULL,
    "node_name" TEXT,
    "status" "RenderNodeStatus" NOT NULL DEFAULT 'active',
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "render_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_job_results" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "render_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_job_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'queued',
    "source_format" TEXT NOT NULL,
    "source_filename" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "import_asset" JSONB,
    "protocol" JSONB NOT NULL DEFAULT '[]',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "DocumentType" NOT NULL,
    "source_kind" "DocumentSourceKind" NOT NULL DEFAULT 'manual_upload',
    "source_id" TEXT,
    "storage_provider" TEXT NOT NULL DEFAULT 'local_fs',
    "storage_bucket" TEXT,
    "storage_key" TEXT NOT NULL,
    "storage_version" INTEGER NOT NULL DEFAULT 1,
    "external_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_public" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "widgets" JSONB NOT NULL DEFAULT '[]',
    "layout" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_indices" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "purchase_index" DOUBLE PRECISION NOT NULL,
    "sales_index" DOUBLE PRECISION NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by" TEXT NOT NULL,

    CONSTRAINT "catalog_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "quote_template" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'EUR',
    "email_from_name" TEXT,
    "email_from_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" "BackupScope" NOT NULL DEFAULT 'daily_snapshot',
    "status" "BackupSnapshotStatus" NOT NULL DEFAULT 'done',
    "storage_provider" TEXT NOT NULL DEFAULT 'local_fs',
    "storage_bucket" TEXT,
    "storage_key" TEXT NOT NULL,
    "entity_count" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" "NotificationEventType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "delivery_status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_articles" (
    "id" TEXT NOT NULL,
    "manufacturer_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "article_type" "ArticleType" NOT NULL DEFAULT 'base_cabinet',
    "base_dims_json" JSONB NOT NULL,
    "meta_json" JSONB NOT NULL DEFAULT '{}',
    "tenant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_options" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "option_key" TEXT NOT NULL,
    "option_type" TEXT NOT NULL,
    "constraints_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_variants" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "variant_key" TEXT NOT NULL,
    "variant_values_json" JSONB NOT NULL,
    "dims_override_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_prices" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "list_net" DOUBLE PRECISION NOT NULL,
    "dealer_net" DOUBLE PRECISION NOT NULL,
    "tax_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "room_id" TEXT,
    "catalog_article_id" TEXT,
    "item_type" "GeneratedItemType" NOT NULL,
    "params_json" JSONB NOT NULL DEFAULT '{}',
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mm',
    "label" TEXT NOT NULL,
    "is_generated" BOOLEAN NOT NULL DEFAULT true,
    "build_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_item_source_links" (
    "id" TEXT NOT NULL,
    "generated_item_id" TEXT NOT NULL,
    "source_placement_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_item_source_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_definitions" (
    "id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "category" "RuleCategory" NOT NULL,
    "severity" "RuleSeverity" NOT NULL DEFAULT 'warning',
    "params_json" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "rule_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_violations" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "rule_definition_id" TEXT,
    "severity" "RuleSeverity" NOT NULL,
    "entity_refs_json" JSONB NOT NULL DEFAULT '[]',
    "message" TEXT NOT NULL,
    "hint" TEXT,
    "auto_fix_possible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "contact_id" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "contact_json" JSONB NOT NULL,
    "consent_json" JSONB NOT NULL DEFAULT '{}',
    "room_json" JSONB NOT NULL DEFAULT '{}',
    "cabinets_json" JSONB NOT NULL DEFAULT '[]',
    "promoted_to_project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'end_customer',
    "company" TEXT,
    "first_name" TEXT,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address_json" JSONB NOT NULL DEFAULT '{}',
    "lead_source" "ContactLeadSource" NOT NULL DEFAULT 'other',
    "budget_estimate" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_contacts" (
    "project_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_contacts_pkey" PRIMARY KEY ("project_id","contact_id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternatives" (
    "id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_settings" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "manufacturer_name" TEXT,
    "model_name" TEXT,
    "handle_name" TEXT,
    "worktop_model" TEXT,
    "worktop_color" TEXT,
    "plinth_height_mm" INTEGER,
    "cover_panel_enabled" BOOLEAN NOT NULL DEFAULT false,
    "room_height_mm" INTEGER,
    "wall_thickness_mm" INTEGER,
    "extra_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_workspace_layouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "layout_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_workspace_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filler_pieces" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "wall_id" TEXT NOT NULL,
    "gap_mm" DOUBLE PRECISION NOT NULL,
    "width_mm" DOUBLE PRECISION NOT NULL,
    "position_mm" DOUBLE PRECISION NOT NULL,
    "side" TEXT NOT NULL,
    "params_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filler_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "height_zones" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "zones_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "height_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plinth_options" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "height_mm" INTEGER NOT NULL DEFAULT 150,
    "depth_mm" INTEGER NOT NULL DEFAULT 60,
    "material" TEXT,
    "color" TEXT,
    "extra_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plinth_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_positions" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sell_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchase_price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_ref" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "order_date" TIMESTAMP(3),
    "delivery_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "unit_price_net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_templates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "model_settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_batch_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "form_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_batch_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_panels" (
    "id" TEXT NOT NULL,
    "alternative_id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "depth_mm" INTEGER NOT NULL,
    "generated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinet_properties" (
    "id" TEXT NOT NULL,
    "placement_id" TEXT NOT NULL,
    "custom_depth_mm" INTEGER,
    "cost_type" VARCHAR(20) NOT NULL DEFAULT 'nicht_bauseits',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinet_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_project_id_version_key" ON "project_versions"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_price_list_id_catalog_item_id_key" ON "price_list_items"("price_list_id", "catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_sku_key" ON "catalog_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "quote_settings_project_id_key" ON "quote_settings"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "block_groups_program_id_code_key" ON "block_groups"("program_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "render_job_results_job_id_key" ON "render_job_results"("job_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_project_id_idx" ON "documents"("tenant_id", "project_id");

-- CreateIndex
CREATE INDEX "documents_project_id_type_idx" ON "documents"("project_id", "type");

-- CreateIndex
CREATE INDEX "documents_tenant_id_source_kind_source_id_idx" ON "documents"("tenant_id", "source_kind", "source_id");

-- CreateIndex
CREATE INDEX "dashboard_configs_tenant_id_user_id_idx" ON "dashboard_configs"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_configs_user_id_key" ON "dashboard_configs"("user_id");

-- CreateIndex
CREATE INDEX "catalog_indices_project_id_applied_at_idx" ON "catalog_indices"("project_id", "applied_at");

-- CreateIndex
CREATE INDEX "catalog_indices_project_id_catalog_id_idx" ON "catalog_indices"("project_id", "catalog_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "backup_snapshots_tenant_id_created_at_idx" ON "backup_snapshots"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_events_tenant_id_created_at_idx" ON "notification_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_events_tenant_id_event_type_idx" ON "notification_events"("tenant_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_code_key" ON "manufacturers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_articles_manufacturer_id_sku_key" ON "catalog_articles"("manufacturer_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "rule_definitions_rule_key_key" ON "rule_definitions"("rule_key");

-- CreateIndex
CREATE UNIQUE INDEX "leads_promoted_to_project_id_key" ON "leads"("promoted_to_project_id");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_last_name_idx" ON "contacts"("tenant_id", "last_name");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_email_idx" ON "contacts"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "project_contacts_contact_id_idx" ON "project_contacts"("contact_id");

-- CreateIndex
CREATE INDEX "areas_project_id_idx" ON "areas"("project_id");

-- CreateIndex
CREATE INDEX "alternatives_area_id_idx" ON "alternatives"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_settings_alternative_id_key" ON "model_settings"("alternative_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_workspace_layouts_user_id_key" ON "user_workspace_layouts"("user_id");

-- CreateIndex
CREATE INDEX "filler_pieces_alternative_id_idx" ON "filler_pieces"("alternative_id");

-- CreateIndex
CREATE UNIQUE INDEX "height_zones_alternative_id_key" ON "height_zones"("alternative_id");

-- CreateIndex
CREATE UNIQUE INDEX "plinth_options_alternative_id_key" ON "plinth_options"("alternative_id");

-- CreateIndex
CREATE INDEX "quote_positions_alternative_id_idx" ON "quote_positions"("alternative_id");

-- CreateIndex
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_idx" ON "purchase_orders"("tenant_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "user_favorites_user_id_entity_type_idx" ON "user_favorites"("user_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_entity_type_entity_id_key" ON "user_favorites"("user_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "model_templates_user_id_idx" ON "model_templates"("user_id");

-- CreateIndex
CREATE INDEX "print_batch_profiles_user_id_idx" ON "print_batch_profiles"("user_id");

-- CreateIndex
CREATE INDEX "print_batch_profiles_tenant_id_idx" ON "print_batch_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_tenant_id_idx" ON "share_links"("tenant_id");

-- CreateIndex
CREATE INDEX "cover_panels_alternative_id_idx" ON "cover_panels"("alternative_id");

-- CreateIndex
CREATE UNIQUE INDEX "cabinet_properties_placement_id_key" ON "cabinet_properties"("placement_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_tax_group_id_fkey" FOREIGN KEY ("tax_group_id") REFERENCES "tax_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_pricing_group_id_fkey" FOREIGN KEY ("pricing_group_id") REFERENCES "pricing_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_quote_settings_id_fkey" FOREIGN KEY ("quote_settings_id") REFERENCES "quote_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_tax_group_id_fkey" FOREIGN KEY ("tax_group_id") REFERENCES "tax_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_price_lists" ADD CONSTRAINT "customer_price_lists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_discounts" ADD CONSTRAINT "customer_discounts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_line_items" ADD CONSTRAINT "project_line_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_groups" ADD CONSTRAINT "block_groups_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "block_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_definitions" ADD CONSTRAINT "block_definitions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "block_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_definitions" ADD CONSTRAINT "block_definitions_block_group_id_fkey" FOREIGN KEY ("block_group_id") REFERENCES "block_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_conditions" ADD CONSTRAINT "block_conditions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "block_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_conditions" ADD CONSTRAINT "block_conditions_block_definition_id_fkey" FOREIGN KEY ("block_definition_id") REFERENCES "block_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_block_evaluations" ADD CONSTRAINT "project_block_evaluations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_block_evaluations" ADD CONSTRAINT "project_block_evaluations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "block_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_block_evaluations" ADD CONSTRAINT "project_block_evaluations_best_block_definition_id_fkey" FOREIGN KEY ("best_block_definition_id") REFERENCES "block_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_job_results" ADD CONSTRAINT "render_job_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "render_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_configs" ADD CONSTRAINT "dashboard_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_indices" ADD CONSTRAINT "catalog_indices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_snapshots" ADD CONSTRAINT "backup_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_articles" ADD CONSTRAINT "catalog_articles_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_options" ADD CONSTRAINT "article_options_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "catalog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_variants" ADD CONSTRAINT "article_variants_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "catalog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_prices" ADD CONSTRAINT "article_prices_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "catalog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_catalog_article_id_fkey" FOREIGN KEY ("catalog_article_id") REFERENCES "catalog_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_item_source_links" ADD CONSTRAINT "generated_item_source_links_generated_item_id_fkey" FOREIGN KEY ("generated_item_id") REFERENCES "generated_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "rule_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_violations" ADD CONSTRAINT "rule_violations_rule_definition_id_fkey" FOREIGN KEY ("rule_definition_id") REFERENCES "rule_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contacts" ADD CONSTRAINT "project_contacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_contacts" ADD CONSTRAINT "project_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternatives" ADD CONSTRAINT "alternatives_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_settings" ADD CONSTRAINT "model_settings_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filler_pieces" ADD CONSTRAINT "filler_pieces_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "height_zones" ADD CONSTRAINT "height_zones_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plinth_options" ADD CONSTRAINT "plinth_options_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_positions" ADD CONSTRAINT "quote_positions_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_templates" ADD CONSTRAINT "model_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_panels" ADD CONSTRAINT "cover_panels_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "alternatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
