-- Sprint 86: multilingual documents & shares
ALTER TABLE "quotes" ADD COLUMN "locale_code" VARCHAR(10);
ALTER TABLE "specification_packages" ADD COLUMN "locale_code" VARCHAR(10);
ALTER TABLE "panorama_tours" ADD COLUMN "locale_code" VARCHAR(10);
ALTER TABLE "share_links" ADD COLUMN "locale_code" VARCHAR(10);
