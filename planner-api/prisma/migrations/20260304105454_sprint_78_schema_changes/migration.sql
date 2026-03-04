-- CreateTable
CREATE TABLE "material_library_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "texture_url" TEXT,
    "preview_url" TEXT,
    "scale_x_mm" DOUBLE PRECISION,
    "scale_y_mm" DOUBLE PRECISION,
    "rotation_deg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roughness" DOUBLE PRECISION,
    "metallic" DOUBLE PRECISION,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_library_items_tenant_id_category_idx" ON "material_library_items"("tenant_id", "category");
