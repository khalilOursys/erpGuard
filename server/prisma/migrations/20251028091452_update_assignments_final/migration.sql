-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" SERIAL NOT NULL,
    "contractSiteServiceId" INTEGER NOT NULL,
    "postIndex" INTEGER NOT NULL,
    "personnelId" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "replacementForId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AssignmentToAttendance" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AssignmentToAttendance_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AssignmentToAttendance_B_index" ON "public"."_AssignmentToAttendance"("B");

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_contractSiteServiceId_fkey" FOREIGN KEY ("contractSiteServiceId") REFERENCES "public"."ClientContractSiteService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_replacementForId_fkey" FOREIGN KEY ("replacementForId") REFERENCES "public"."Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AssignmentToAttendance" ADD CONSTRAINT "_AssignmentToAttendance_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AssignmentToAttendance" ADD CONSTRAINT "_AssignmentToAttendance_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
