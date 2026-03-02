-- CreateEnum
CREATE TYPE "IfcJobStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateTable
CREATE TABLE "ifc_import_jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "IfcJobStatus" NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ifc_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ifc_import_jobs_project_id_idx" ON "ifc_import_jobs"("project_id");

-- AddForeignKey
ALTER TABLE "ifc_import_jobs" ADD CONSTRAINT "ifc_import_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
