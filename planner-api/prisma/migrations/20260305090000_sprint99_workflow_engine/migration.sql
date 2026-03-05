-- Sprint 99: Workflow Engine (BPMN Light)

CREATE TYPE "WorkflowEntityType" AS ENUM ('project', 'quote', 'production_order');

CREATE TABLE "workflow_definitions" (
    "id"         TEXT NOT NULL,
    "tenant_id"  TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "version"    INTEGER NOT NULL DEFAULT 1,
    "is_active"  BOOLEAN NOT NULL DEFAULT false,
    "graph_json" JSONB NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_instances" (
    "id"              TEXT NOT NULL,
    "tenant_id"       TEXT NOT NULL,
    "definition_id"   TEXT NOT NULL,
    "entity_type"     "WorkflowEntityType" NOT NULL,
    "entity_id"       TEXT NOT NULL,
    "current_node_id" TEXT NOT NULL,
    "metadata_json"   JSONB NOT NULL DEFAULT '{}',
    "started_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at"     TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_events" (
    "id"               TEXT NOT NULL,
    "tenant_id"        TEXT NOT NULL,
    "instance_id"      TEXT NOT NULL,
    "from_node_id"     TEXT,
    "to_node_id"       TEXT NOT NULL,
    "transition_label" TEXT,
    "reason"           TEXT,
    "guard_result"     JSONB,
    "actor_user_id"    TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_definitions_tenant_name_version_idx"
    ON "workflow_definitions"("tenant_id", "name", "version");

CREATE INDEX "workflow_definitions_tenant_active_idx"
    ON "workflow_definitions"("tenant_id", "is_active");

CREATE INDEX "workflow_instances_tenant_entity_idx"
    ON "workflow_instances"("tenant_id", "entity_type", "entity_id");

CREATE INDEX "workflow_instances_tenant_definition_idx"
    ON "workflow_instances"("tenant_id", "definition_id");

CREATE INDEX "workflow_events_tenant_instance_created_at_idx"
    ON "workflow_events"("tenant_id", "instance_id", "created_at");

ALTER TABLE "workflow_instances"
    ADD CONSTRAINT "workflow_instances_definition_id_fkey"
    FOREIGN KEY ("definition_id")
    REFERENCES "workflow_definitions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_events"
    ADD CONSTRAINT "workflow_events_instance_id_fkey"
    FOREIGN KEY ("instance_id")
    REFERENCES "workflow_instances"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
