-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "email" TEXT,
ADD COLUMN     "logoId" INTEGER,
ADD COLUMN     "matriculeFiscale" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rib" TEXT;

-- CreateIndex
CREATE INDEX "Company_matriculeFiscale_idx" ON "public"."Company"("matriculeFiscale");

-- CreateIndex
CREATE INDEX "Company_email_idx" ON "public"."Company"("email");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
