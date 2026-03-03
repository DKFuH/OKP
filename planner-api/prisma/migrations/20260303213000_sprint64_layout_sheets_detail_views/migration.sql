CREATE TYPE "LayoutSheetType" AS ENUM ('floorplan', 'elevations', 'installation', 'detail', 'section');
CREATE TYPE "ViewType" AS ENUM ('floorplan', 'elevation', 'section', 'detail', 'isometric');

CREATE TABLE "layout_sheets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "project_id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "sheet_type" "LayoutSheetType" NOT NULL DEFAULT 'floorplan',
  "position" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "layout_sheets_project_id_idx" ON "layout_sheets"("project_id");

CREATE TABLE "layout_views" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sheet_id" TEXT NOT NULL REFERENCES "layout_sheets"("id") ON DELETE CASCADE,
  "view_type" "ViewType" NOT NULL,
  "label" TEXT,
  "room_id" TEXT,
  "wall_id" TEXT,
  "clip_x_mm" DOUBLE PRECISION,
  "clip_y_mm" DOUBLE PRECISION,
  "clip_w_mm" DOUBLE PRECISION,
  "clip_h_mm" DOUBLE PRECISION,
  "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "x_on_sheet" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "y_on_sheet" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "layout_views_sheet_id_idx" ON "layout_views"("sheet_id");
