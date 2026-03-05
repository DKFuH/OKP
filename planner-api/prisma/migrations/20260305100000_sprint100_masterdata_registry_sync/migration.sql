-- Sprint 100: Masterdata Registry and Studio Sync

CREATE TYPE "MasterDataEntityType" AS ENUM ('customer', 'supplier', 'location');
CREATE TYPE "MasterSyncConflictStatus" AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE "master_customers" (
    "id"           TEXT NOT NULL,
    "tenant_id"    TEXT NOT NULL,
    "external_ref" TEXT,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "version"      INTEGER NOT NULL DEFAULT 1,
    "is_deleted"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_suppliers" (
    "id"           TEXT NOT NULL,
    "tenant_id"    TEXT NOT NULL,
    "external_ref" TEXT,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "version"      INTEGER NOT NULL DEFAULT 1,
    "is_deleted"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_locations" (
    "id"           TEXT NOT NULL,
    "tenant_id"    TEXT NOT NULL,
    "external_ref" TEXT,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "version"      INTEGER NOT NULL DEFAULT 1,
    "is_deleted"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_sync_subscriptions" (
    "id"               TEXT NOT NULL,
    "tenant_id"        TEXT NOT NULL,
    "target_system"    TEXT NOT NULL,
    "scope_json"       JSONB NOT NULL DEFAULT '{}',
    "last_sync_cursor" TIMESTAMP(3),
    "status"           TEXT NOT NULL DEFAULT 'active',
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_sync_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_sync_checkpoints" (
    "id"               TEXT NOT NULL,
    "tenant_id"        TEXT NOT NULL,
    "target_system"    TEXT NOT NULL,
    "last_sync_cursor" TIMESTAMP(3),
    "status"           TEXT NOT NULL DEFAULT 'active',
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_sync_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_sync_conflicts" (
    "id"               TEXT NOT NULL,
    "tenant_id"        TEXT NOT NULL,
    "entity_type"      "MasterDataEntityType" NOT NULL,
    "entity_id"        TEXT NOT NULL,
    "expected_version" INTEGER,
    "actual_version"   INTEGER,
    "incoming_payload" JSONB,
    "status"           "MasterSyncConflictStatus" NOT NULL DEFAULT 'open',
    "resolved_by"      TEXT,
    "resolved_at"      TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_sync_conflicts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "master_customers_tenant_updated_at_idx"
    ON "master_customers"("tenant_id", "updated_at");

CREATE INDEX "master_customers_tenant_external_ref_idx"
    ON "master_customers"("tenant_id", "external_ref");

CREATE INDEX "master_suppliers_tenant_updated_at_idx"
    ON "master_suppliers"("tenant_id", "updated_at");

CREATE INDEX "master_suppliers_tenant_external_ref_idx"
    ON "master_suppliers"("tenant_id", "external_ref");

CREATE INDEX "master_locations_tenant_updated_at_idx"
    ON "master_locations"("tenant_id", "updated_at");

CREATE INDEX "master_locations_tenant_external_ref_idx"
    ON "master_locations"("tenant_id", "external_ref");

CREATE UNIQUE INDEX "master_sync_subscriptions_tenant_target_system_key"
    ON "master_sync_subscriptions"("tenant_id", "target_system");

CREATE UNIQUE INDEX "master_sync_checkpoints_tenant_target_system_key"
    ON "master_sync_checkpoints"("tenant_id", "target_system");

CREATE INDEX "master_sync_conflicts_tenant_status_created_at_idx"
    ON "master_sync_conflicts"("tenant_id", "status", "created_at");

CREATE INDEX "master_sync_conflicts_tenant_entity_idx"
    ON "master_sync_conflicts"("tenant_id", "entity_type", "entity_id");
