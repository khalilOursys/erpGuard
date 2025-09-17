/*
  Warnings:

  - You are about to drop the column `latitude` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Mission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Client" DROP CONSTRAINT "Client_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "rib" TEXT,
ADD COLUMN     "tax_number" TEXT;

-- AlterTable
ALTER TABLE "public"."Mission" DROP COLUMN "latitude",
DROP COLUMN "location",
DROP COLUMN "longitude",
ADD COLUMN     "locationId" INTEGER;

-- AlterTable
ALTER TABLE "public"."MissionServiceRequirement" ADD COLUMN     "basePay" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "clientPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "extraPay" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Country Name',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_clientId_idx" ON "public"."Location"("clientId");

-- CreateIndex
CREATE INDEX "Location_cityId_idx" ON "public"."Location"("cityId");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "public"."City"("name");

-- CreateIndex
CREATE INDEX "City_state_idx" ON "public"."City"("state");

-- CreateIndex
CREATE INDEX "City_country_idx" ON "public"."City"("country");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_state_country_key" ON "public"."City"("name", "state", "country");

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
