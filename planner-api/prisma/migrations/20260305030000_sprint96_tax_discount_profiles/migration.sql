-- Sprint 96: MwSt-, Skonto- & Zusatzartikel-Profile

CREATE TABLE "tax_profiles" (
    "id"          TEXT NOT NULL,
    "tenant_id"   TEXT,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "tax_rate"    DOUBLE PRECISION NOT NULL,
    "is_default"  BOOLEAN NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "discount_profiles" (
    "id"           TEXT NOT NULL,
    "tenant_id"    TEXT,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "skonto_pct"   DOUBLE PRECISION NOT NULL,
    "payment_days" INTEGER NOT NULL,
    "is_default"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_profiles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quotes"
    ADD COLUMN "tax_profile_id"      TEXT,
    ADD COLUMN "discount_profile_id" TEXT;

ALTER TABLE "quotes"
    ADD CONSTRAINT "quotes_tax_profile_id_fkey"
        FOREIGN KEY ("tax_profile_id")
        REFERENCES "tax_profiles"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes"
    ADD CONSTRAINT "quotes_discount_profile_id_fkey"
        FOREIGN KEY ("discount_profile_id")
        REFERENCES "discount_profiles"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
