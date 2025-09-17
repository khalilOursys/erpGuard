-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('FACTORY', 'BANK', 'INDIVIDUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'COMMERCIAL', 'MANAGER', 'ACCOUNTANT', 'GUARD');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'TIME_OFF', 'JUSTIFIED_ABSENCE', 'REPLACEMENT', 'EXTRA_TIME');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('EMAIL', 'PHONE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReplacementType" AS ENUM ('PLANNED', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."BillingStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BillingLineType" AS ENUM ('SERVICE', 'PERSONNEL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."RateSource" AS ENUM ('MANUAL', 'API');

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyContact" (
    "id" SERIAL NOT NULL,
    "type" "public"."ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "CompanyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ClientType" NOT NULL,
    "address" TEXT,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientContact" (
    "id" SERIAL NOT NULL,
    "type" "public"."ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultBasePay" DECIMAL(16,2),
    "defaultExtraPay" DECIMAL(16,2),
    "defaultClientPrice" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Personnel" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "identifier" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseSalary" DECIMAL(16,2) NOT NULL,
    "serviceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PersonnelContract" (
    "id" SERIAL NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "fileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PersonnelContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientContract" (
    "id" SERIAL NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clientId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "fileId" INTEGER,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClientContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientContractService" (
    "id" SERIAL NOT NULL,
    "clientContractId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "basePay" DECIMAL(16,2) NOT NULL,
    "extraPay" DECIMAL(16,2) NOT NULL,
    "clientPrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContractService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContractExtension" (
    "id" SERIAL NOT NULL,
    "clientContractId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "fileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "requiredPersonnel" INTEGER NOT NULL,
    "extraPersonnelSlots" INTEGER NOT NULL DEFAULT 0,
    "serviceChiefId" INTEGER,
    "managerId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionServiceRequirement" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "requiredCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MissionServiceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionAssignment" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "post" TEXT,
    "role" TEXT,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attendance" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "replacementForId" INTEGER,
    "replacementType" "public"."ReplacementType",
    "notedById" INTEGER,
    "personnelId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "displayname" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" SERIAL NOT NULL,
    "roleName" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPermission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "grantedById" INTEGER,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousData" JSONB,
    "newData" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentRecord" (
    "id" SERIAL NOT NULL,
    "personnelId" INTEGER NOT NULL,
    "missionId" INTEGER,
    "assignmentId" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basePay" DECIMAL(16,2) NOT NULL,
    "extraPay" DECIMAL(16,2) NOT NULL,
    "overtimePay" DECIMAL(16,2) NOT NULL,
    "deductions" DECIMAL(16,2) NOT NULL,
    "totalPay" DECIMAL(18,2) NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "computedAt" TIMESTAMP(3),
    "generatedById" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER,
    "checksum" TEXT,
    "uploadedById" INTEGER,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Billing" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "contractId" INTEGER,
    "generatedById" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "amountBaseCurrency" DECIMAL(18,2) NOT NULL,
    "targetCurrency" TEXT,
    "conversionRate" DECIMAL(24,12),
    "rateSource" "public"."RateSource",
    "amountTargetCurrency" DECIMAL(18,2),
    "status" "public"."BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "taxTotalBase" DECIMAL(16,2),
    "taxTotalTarget" DECIMAL(16,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingLine" (
    "id" SERIAL NOT NULL,
    "billingId" INTEGER NOT NULL,
    "lineType" "public"."BillingLineType" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT NOT NULL,
    "missionId" INTEGER,
    "assignmentId" INTEGER,
    "personnelId" INTEGER,
    "serviceId" INTEGER,
    "contractId" INTEGER,
    "personnelCount" INTEGER NOT NULL DEFAULT 1,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceBase" DECIMAL(18,2) NOT NULL,
    "lineTotalBase" DECIMAL(20,2) NOT NULL,
    "discountPercent" DECIMAL(5,2),
    "discountAmountBase" DECIMAL(18,2),
    "totalAfterDiscountBase" DECIMAL(20,2) NOT NULL,
    "taxPercent" DECIMAL(6,2),
    "taxAmountBase" DECIMAL(18,2),
    "unitPriceTarget" DECIMAL(18,2),
    "lineTotalTarget" DECIMAL(20,2),
    "discountAmountTarget" DECIMAL(18,2),
    "totalAfterDiscountTarget" DECIMAL(20,2),
    "taxAmountTarget" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" SERIAL NOT NULL,
    "billingId" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "public"."Company"("name");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "public"."Company"("name");

-- CreateIndex
CREATE INDEX "CompanyContact_companyId_idx" ON "public"."CompanyContact"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "public"."Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "public"."Client"("name");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "public"."ClientContact"("clientId");

-- CreateIndex
CREATE INDEX "Service_companyId_idx" ON "public"."Service"("companyId");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "public"."Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_identifier_key" ON "public"."Personnel"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_email_key" ON "public"."Personnel"("email");

-- CreateIndex
CREATE INDEX "Personnel_companyId_idx" ON "public"."Personnel"("companyId");

-- CreateIndex
CREATE INDEX "Personnel_email_idx" ON "public"."Personnel"("email");

-- CreateIndex
CREATE INDEX "Personnel_serviceId_idx" ON "public"."Personnel"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelContract_contractNumber_key" ON "public"."PersonnelContract"("contractNumber");

-- CreateIndex
CREATE INDEX "PersonnelContract_personnelId_idx" ON "public"."PersonnelContract"("personnelId");

-- CreateIndex
CREATE INDEX "PersonnelContract_startDate_endDate_idx" ON "public"."PersonnelContract"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContract_contractNumber_key" ON "public"."ClientContract"("contractNumber");

-- CreateIndex
CREATE INDEX "ClientContract_clientId_idx" ON "public"."ClientContract"("clientId");

-- CreateIndex
CREATE INDEX "ClientContract_startDate_endDate_idx" ON "public"."ClientContract"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ClientContract_companyId_idx" ON "public"."ClientContract"("companyId");

-- CreateIndex
CREATE INDEX "ClientContractService_serviceId_idx" ON "public"."ClientContractService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContractService_clientContractId_serviceId_key" ON "public"."ClientContractService"("clientContractId", "serviceId");

-- CreateIndex
CREATE INDEX "ContractExtension_clientContractId_idx" ON "public"."ContractExtension"("clientContractId");

-- CreateIndex
CREATE INDEX "Mission_contractId_idx" ON "public"."Mission"("contractId");

-- CreateIndex
CREATE INDEX "Mission_startDate_endDate_idx" ON "public"."Mission"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Mission_managerId_idx" ON "public"."Mission"("managerId");

-- CreateIndex
CREATE INDEX "Mission_companyId_idx" ON "public"."Mission"("companyId");

-- CreateIndex
CREATE INDEX "MissionServiceRequirement_missionId_idx" ON "public"."MissionServiceRequirement"("missionId");

-- CreateIndex
CREATE INDEX "MissionServiceRequirement_serviceId_idx" ON "public"."MissionServiceRequirement"("serviceId");

-- CreateIndex
CREATE INDEX "MissionAssignment_missionId_idx" ON "public"."MissionAssignment"("missionId");

-- CreateIndex
CREATE INDEX "MissionAssignment_personnelId_idx" ON "public"."MissionAssignment"("personnelId");

-- CreateIndex
CREATE INDEX "Attendance_assignmentId_date_idx" ON "public"."Attendance"("assignmentId", "date");

-- CreateIndex
CREATE INDEX "Attendance_notedById_idx" ON "public"."Attendance"("notedById");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "public"."Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_identifier_key" ON "public"."User"("identifier");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "public"."User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE INDEX "RolePermission_roleName_idx" ON "public"."RolePermission"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleName_permissionId_key" ON "public"."RolePermission"("roleName", "permissionId");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "public"."UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "public"."UserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "public"."UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "public"."Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_channel_idx" ON "public"."Notification"("channel");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "PaymentRecord_personnelId_idx" ON "public"."PaymentRecord"("personnelId");

-- CreateIndex
CREATE INDEX "PaymentRecord_missionId_idx" ON "public"."PaymentRecord"("missionId");

-- CreateIndex
CREATE INDEX "PaymentRecord_periodStart_periodEnd_idx" ON "public"."PaymentRecord"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "File_filename_idx" ON "public"."File"("filename");

-- CreateIndex
CREATE INDEX "Billing_companyId_idx" ON "public"."Billing"("companyId");

-- CreateIndex
CREATE INDEX "Billing_clientId_idx" ON "public"."Billing"("clientId");

-- CreateIndex
CREATE INDEX "Billing_invoiceNumber_idx" ON "public"."Billing"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Billing_status_idx" ON "public"."Billing"("status");

-- CreateIndex
CREATE INDEX "Billing_periodStart_periodEnd_idx" ON "public"."Billing"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_companyId_invoiceNumber_key" ON "public"."Billing"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingLine_billingId_idx" ON "public"."BillingLine"("billingId");

-- CreateIndex
CREATE INDEX "BillingLine_missionId_idx" ON "public"."BillingLine"("missionId");

-- CreateIndex
CREATE INDEX "BillingLine_assignmentId_idx" ON "public"."BillingLine"("assignmentId");

-- CreateIndex
CREATE INDEX "BillingLine_personnelId_idx" ON "public"."BillingLine"("personnelId");

-- CreateIndex
CREATE INDEX "BillingLine_contractId_idx" ON "public"."BillingLine"("contractId");

-- CreateIndex
CREATE INDEX "BillingLine_serviceId_idx" ON "public"."BillingLine"("serviceId");

-- CreateIndex
CREATE INDEX "Payment_billingId_idx" ON "public"."Payment"("billingId");

-- AddForeignKey
ALTER TABLE "public"."CompanyContact" ADD CONSTRAINT "CompanyContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Personnel" ADD CONSTRAINT "Personnel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Personnel" ADD CONSTRAINT "Personnel_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonnelContract" ADD CONSTRAINT "PersonnelContract_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonnelContract" ADD CONSTRAINT "PersonnelContract_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContract" ADD CONSTRAINT "ClientContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContract" ADD CONSTRAINT "ClientContract_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractService" ADD CONSTRAINT "ClientContractService_clientContractId_fkey" FOREIGN KEY ("clientContractId") REFERENCES "public"."ClientContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientContractService" ADD CONSTRAINT "ClientContractService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractExtension" ADD CONSTRAINT "ContractExtension_clientContractId_fkey" FOREIGN KEY ("clientContractId") REFERENCES "public"."ClientContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractExtension" ADD CONSTRAINT "ContractExtension_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ClientContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_serviceChiefId_fkey" FOREIGN KEY ("serviceChiefId") REFERENCES "public"."Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionServiceRequirement" ADD CONSTRAINT "MissionServiceRequirement_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionServiceRequirement" ADD CONSTRAINT "MissionServiceRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionAssignment" ADD CONSTRAINT "MissionAssignment_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionAssignment" ADD CONSTRAINT "MissionAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."MissionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_replacementForId_fkey" FOREIGN KEY ("replacementForId") REFERENCES "public"."Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_notedById_fkey" FOREIGN KEY ("notedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."MissionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Billing" ADD CONSTRAINT "Billing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Billing" ADD CONSTRAINT "Billing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Billing" ADD CONSTRAINT "Billing_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ClientContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Billing" ADD CONSTRAINT "Billing_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "public"."Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."MissionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "public"."Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingLine" ADD CONSTRAINT "BillingLine_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "public"."ClientContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "public"."Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
