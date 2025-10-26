/*
  Warnings:

  - You are about to drop the `ClientContractService` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ClientContractService" DROP CONSTRAINT "ClientContractService_clientContractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ClientContractService" DROP CONSTRAINT "ClientContractService_serviceId_fkey";

-- DropTable
DROP TABLE "public"."ClientContractService";
