/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Personnel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Personnel_email_key" ON "public"."Personnel"("email");
