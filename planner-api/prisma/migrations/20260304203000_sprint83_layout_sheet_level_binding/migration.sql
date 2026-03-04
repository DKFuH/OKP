-- AlterTable
ALTER TABLE "layout_sheets" ADD COLUMN "level_id" TEXT;

-- CreateIndex
CREATE INDEX "layout_sheets_level_id_idx" ON "layout_sheets"("level_id");

-- AddForeignKey
ALTER TABLE "layout_sheets" ADD CONSTRAINT "layout_sheets_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "building_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
