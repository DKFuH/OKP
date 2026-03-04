-- CreateEnum
CREATE TYPE "ConstraintType" AS ENUM (
  'horizontal',
  'vertical',
  'parallel',
  'perpendicular',
  'coincident',
  'equal_length',
  'symmetry_axis',
  'driving_dimension'
);

-- CreateTable
CREATE TABLE "geometry_constraints" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "room_id" TEXT NOT NULL,
  "type" "ConstraintType" NOT NULL,
  "target_refs" JSONB NOT NULL DEFAULT '[]',
  "value_json" JSONB NOT NULL DEFAULT '{}',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "geometry_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geometry_constraints_tenant_id_room_id_idx" ON "geometry_constraints"("tenant_id", "room_id");
