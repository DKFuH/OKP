-- CreateTable
CREATE TABLE "project_environments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "north_angle_deg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" VARCHAR(60),
    "default_datetime" TIMESTAMP(3),
    "daylight_enabled" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_environments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_environments_project_id_key" ON "project_environments"("project_id");

-- CreateIndex
CREATE INDEX "project_environments_tenant_id_project_id_idx" ON "project_environments"("tenant_id", "project_id");
