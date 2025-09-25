-- DropForeignKey
ALTER TABLE "public"."Site" DROP CONSTRAINT "Site_cityId_fkey";

-- AlterTable
ALTER TABLE "public"."Site" ALTER COLUMN "cityId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Site" ADD CONSTRAINT "Site_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
