-- AlterTable
ALTER TABLE "public"."MissionAssignment" ADD COLUMN     "missionPostId" INTEGER;

-- CreateTable
CREATE TABLE "public"."MissionPost" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "postNumber" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionPost_missionId_serviceId_postNumber_idx" ON "public"."MissionPost"("missionId", "serviceId", "postNumber");

-- AddForeignKey
ALTER TABLE "public"."MissionPost" ADD CONSTRAINT "MissionPost_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionPost" ADD CONSTRAINT "MissionPost_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionAssignment" ADD CONSTRAINT "MissionAssignment_missionPostId_fkey" FOREIGN KEY ("missionPostId") REFERENCES "public"."MissionPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
