/*
  Warnings:

  - You are about to drop the column `checkIn` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkOut` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `notedById` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `personnelId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `replacementForId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `replacementType` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentId` on the `BillingLine` table. All the data in the column will be lost.
  - You are about to drop the column `missionId` on the `BillingLine` table. All the data in the column will be lost.
  - You are about to drop the column `missionId` on the `PaymentRecord` table. All the data in the column will be lost.
  - You are about to drop the `Mission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MissionServiceRequirement` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[assignmentId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_notedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_personnelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_replacementForId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BillingLine" DROP CONSTRAINT "BillingLine_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BillingLine" DROP CONSTRAINT "BillingLine_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BillingLine" DROP CONSTRAINT "BillingLine_missionServiceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_contractId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_managerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_serviceChiefId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Mission" DROP CONSTRAINT "Mission_siteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionAssignment" DROP CONSTRAINT "MissionAssignment_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionAssignment" DROP CONSTRAINT "MissionAssignment_missionPostId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionAssignment" DROP CONSTRAINT "MissionAssignment_personnelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionPost" DROP CONSTRAINT "MissionPost_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionPost" DROP CONSTRAINT "MissionPost_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionServiceRequirement" DROP CONSTRAINT "MissionServiceRequirement_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MissionServiceRequirement" DROP CONSTRAINT "MissionServiceRequirement_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRecord" DROP CONSTRAINT "PaymentRecord_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PaymentRecord" DROP CONSTRAINT "PaymentRecord_missionId_fkey";

-- DropIndex
DROP INDEX "public"."Attendance_assignmentId_date_idx";

-- DropIndex
DROP INDEX "public"."Attendance_notedById_idx";

-- DropIndex
DROP INDEX "public"."Attendance_status_idx";

-- DropIndex
DROP INDEX "public"."BillingLine_assignmentId_idx";

-- DropIndex
DROP INDEX "public"."BillingLine_missionId_idx";

-- DropIndex
DROP INDEX "public"."PaymentRecord_missionId_idx";

-- AlterTable
ALTER TABLE "public"."Attendance" DROP COLUMN "checkIn",
DROP COLUMN "checkOut",
DROP COLUMN "notedById",
DROP COLUMN "personnelId",
DROP COLUMN "replacementForId",
DROP COLUMN "replacementType",
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."BillingLine" DROP COLUMN "assignmentId",
DROP COLUMN "missionId";

-- AlterTable
ALTER TABLE "public"."PaymentRecord" DROP COLUMN "missionId";

-- DropTable
DROP TABLE "public"."Mission";

-- DropTable
DROP TABLE "public"."MissionAssignment";

-- DropTable
DROP TABLE "public"."MissionPost";

-- DropTable
DROP TABLE "public"."MissionServiceRequirement";

-- CreateTable
CREATE TABLE "public"."_AttendanceToPersonnel" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AttendanceToPersonnel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_AttendanceToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AttendanceToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AttendanceToPersonnel_B_index" ON "public"."_AttendanceToPersonnel"("B");

-- CreateIndex
CREATE INDEX "_AttendanceToUser_B_index" ON "public"."_AttendanceToUser"("B");

-- CreateIndex
CREATE INDEX "Attendance_assignmentId_idx" ON "public"."Attendance"("assignmentId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "public"."Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_assignmentId_date_key" ON "public"."Attendance"("assignmentId", "date");

-- AddForeignKey
ALTER TABLE "public"."_AttendanceToPersonnel" ADD CONSTRAINT "_AttendanceToPersonnel_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AttendanceToPersonnel" ADD CONSTRAINT "_AttendanceToPersonnel_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AttendanceToUser" ADD CONSTRAINT "_AttendanceToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AttendanceToUser" ADD CONSTRAINT "_AttendanceToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
