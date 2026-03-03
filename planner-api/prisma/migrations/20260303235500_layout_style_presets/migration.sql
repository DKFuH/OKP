CREATE TABLE IF NOT EXISTS "layout_style_presets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "text_height_mm" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
  "arrow_size_mm" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "line_width_mm" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "centerline_dash_mm" DOUBLE PRECISION NOT NULL DEFAULT 6,
  "symbol_scale_mm" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "font_family" VARCHAR(120),
  "config_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "layout_style_presets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "layout_style_presets_tenant_id_idx" ON "layout_style_presets"("tenant_id");
