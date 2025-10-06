-- CreateTable
CREATE TABLE "public"."ColumnConfig" (
    "id" SERIAL NOT NULL,
    "billingId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColumnConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ColumnConfig_billingId_idx" ON "public"."ColumnConfig"("billingId");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnConfig_billingId_key_key" ON "public"."ColumnConfig"("billingId", "key");

-- AddForeignKey
ALTER TABLE "public"."ColumnConfig" ADD CONSTRAINT "ColumnConfig_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "public"."Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
