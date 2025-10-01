-- AlterEnum
ALTER TYPE "public"."BillingLineType" ADD VALUE 'MISSION';

-- AlterTable
ALTER TABLE "public"."Billing" ALTER COLUMN "amountBaseCurrency" DROP NOT NULL;
