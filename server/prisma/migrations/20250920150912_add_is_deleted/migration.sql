/*
  Warnings:

  - You are about to drop the column `locationId` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'SUBMITTED_FOR_REVIEW', 'CONFIRMED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Client" DROP CONSTRAINT "Client_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_cityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_locationId_fkey";

-- AlterTable
ALTER TABLE "public"."Attendance" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Billing" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."BillingLine" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."City" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."ClientContract" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" INTEGER,
ADD COLUMN     "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" INTEGER,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Mission" DROP COLUMN "locationId",
ADD COLUMN     "siteId" INTEGER,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."MissionAssignment" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."PaymentRecord" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Personnel" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."PersonnelContract" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Service" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "code" DROP NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "public"."Location";

-- CreateTable
CREATE TABLE "public"."Site" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "road" TEXT,
    "postalCode" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "cityId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientContractSite" (
    "id" SERIAL NOT NULL,
    "clientContractId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientContractSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientContractSiteService" (
    "id" SERIAL NOT NULL,
    "contractSiteId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,
    "basePay" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "extraPay" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "clientPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContractSiteService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Site_clientId_idx" ON "public"."Site"("clientId");

-- CreateIndex
CREATE INDEX "Site_cityId_idx" ON "public"."Site"("cityId");

-- CreateIndex
CREATE INDEX "ClientContractSite_clientContractId_idx" ON "public"."ClientContractSite"("clientContractId");

-- CreateIndex
CREATE INDEX "ClientContractSite_siteId_idx" ON "public"."ClientContractSite"("siteId");

-- CreateIndex
CREATE INDEX "ClientContractSiteService_contractSiteId_idx" ON "public"."ClientContractSiteService"("contractSiteId");

-- CreateIndex
CREATE INDEX "ClientContractSiteService_serviceId_idx" ON "public"."ClientContractSiteService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContractSiteService_contractSiteId_serviceId_key" ON "public"."ClientContractSiteService"("contractSiteId", "serviceId");

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Site" ADD CONSTRAINT "Site_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContract" ADD CONSTRAINT "ClientContract_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContract" ADD CONSTRAINT "ClientContract_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractSite" ADD CONSTRAINT "ClientContractSite_clientContractId_fkey" FOREIGN KEY ("clientContractId") REFERENCES "public"."ClientContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractSite" ADD CONSTRAINT "ClientContractSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractSiteService" ADD CONSTRAINT "ClientContractSiteService_contractSiteId_fkey" FOREIGN KEY ("contractSiteId") REFERENCES "public"."ClientContractSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractSiteService" ADD CONSTRAINT "ClientContractSiteService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
