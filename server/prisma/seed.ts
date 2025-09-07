// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seed');

  // 1) Company
  const companyName = 'Default Company';
  let company = await prisma.company.findUnique({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName, baseCurrency: 'USD' },
    });
  }

  // 2) Permissions (canonical set)
  const perms = [
    { name: 'services.read', description: 'View services' },
    { name: 'services.manage', description: 'Create/edit/delete services' },
    { name: 'personnel.read', description: 'View personnel' },
    { name: 'personnel.manage', description: 'Create/edit personnel' },
    { name: 'users.read', description: 'View users' },
    { name: 'users.manage', description: 'Create/edit users' },
    { name: 'missions.read', description: 'View missions' },
    { name: 'missions.manage', description: 'Manage missions and assignments' },
    { name: 'attendance.read', description: 'View attendance' },
    { name: 'attendance.edit', description: 'Edit attendance' },
    { name: 'billing.read', description: 'View billing/invoices' },
    { name: 'billing.generate', description: 'Generate invoices' },
    { name: 'company.manage', description: 'Company-wide admin' },
    { name: 'company.read', description: 'Company-wide admin reading' },
    { name: 'client.read', description: 'View clients' },
    { name: 'client.manage', description: 'Create/edit clients' },
  ];

  for (const p of perms) {
    const existing = await prisma.permission.findUnique({ where: { name: p.name } });
    if (!existing) {
      await prisma.permission.create({ data: p });
    }
  }
  console.log('Permissions ensured');

  // 3) Role -> permission mappings
  const roleMap: Record<string, string[]> = {
    ADMIN: ['company.manage', 'billing.generate', 'billing.read', 'services.manage', 'personnel.manage', 'missions.manage', 'attendance.edit','users.manage','users.read'],
    MANAGER: ['missions.manage', 'attendance.edit', 'personnel.read', 'missions.read'],
    ACCOUNTANT: ['billing.read', 'billing.generate', 'attendance.read'],
    COMMERCIAL: ['services.manage', 'missions.read', 'personnel.read'],
    GUARD: ['attendance.read', 'missions.read'],
  };

  for (const [roleName, permNames] of Object.entries(roleMap)) {
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      const exists = await prisma.rolePermission.findFirst({
        where: { roleName, permissionId: perm.id },
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: { roleName, permissionId: perm.id },
        });
      }
    }
  }
  console.log('Role -> permission mappings ensured');

  // 4) Services (ensure required fields name & code present)
  async function ensureService(data: {
    code: string;
    name: string;
    description?: string;
    defaultBasePay?: number;
    defaultExtraPay?: number;
    defaultClientPrice?: number;
  }) {
    const found = await prisma.service.findFirst({
      where: { companyId: company!.id, name: data.name },
    });
    if (found) return found;
    return prisma.service.create({
      data: {
        companyId: company!.id,
        code: data.code,
        name: data.name,
        description: data.description,
        defaultBasePay: data.defaultBasePay as any,
        defaultExtraPay: data.defaultExtraPay as any,
        defaultClientPrice: data.defaultClientPrice as any,
      },
    });
  }

  const guardService = await ensureService({
    code: 'GUARD',
    name: 'Guard Service',
    description: 'Armed/unarmed security guards',
    defaultBasePay: 1000,
    defaultExtraPay: 200,
    defaultClientPrice: 1500,
  });

  const cookingService = await ensureService({
    code: 'COOK',
    name: 'Cooking Service',
    description: 'Kitchen staff',
    defaultBasePay: 800,
    defaultExtraPay: 100,
    defaultClientPrice: 1200,
  });

  const cleaningService = await ensureService({
    code: 'CLEAN',
    name: 'Cleaning Service',
    description: 'Cleaning & janitorial staff',
    defaultBasePay: 600,
    defaultExtraPay: 50,
    defaultClientPrice: 900,
  });

  console.log('Services ensured');

  // 5) Personnel
  async function ensurePersonnel(data: {
    firstName: string;
    lastName: string;
    email?: string;
    baseSalary: number;
    serviceId?: number;
  }) {
    if (data.email) {
      const found = await prisma.personnel.findUnique({ where: { email: data.email } });
      if (found) return found;
    }
    return prisma.personnel.create({
      data: {
        companyId: company!.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        baseSalary: data.baseSalary as any,
        serviceId: data.serviceId,
      },
    });
  }

  const john = await ensurePersonnel({
    firstName: 'John',
    lastName: 'Guard',
    email: 'john.guard@example.com',
    baseSalary: 1000,
    serviceId: guardService.id,
  });

  const amy = await ensurePersonnel({
    firstName: 'Amy',
    lastName: 'Cook',
    email: 'amy.cook@example.com',
    baseSalary: 800,
    serviceId: cookingService.id,
  });

  const sana = await ensurePersonnel({
    firstName: 'Sana',
    lastName: 'Cleaner',
    email: 'sana.clean@example.com',
    baseSalary: 600,
    serviceId: cleaningService.id,
  });

  console.log('Personnel ensured');

  // 6) Admin user - create BEFORE missions (so we can use admin.id as managerId)
  const adminIdentifier = 'admin';
  const adminPassword = 'adminpass';
  let adminUser = await prisma.user.findUnique({ where: { identifier: adminIdentifier } });
  if (!adminUser) {
    const hash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        companyId: company.id,
        identifier: adminIdentifier,
        displayname: 'Administrator',
        password: hash,
        // use string cast to avoid enum import issues during early runs
        role: 'ADMIN' as any,
      },
    });
  }
  console.log('Admin user ensured (identifier=admin)');

  // 7) Client & Contract (client.type is required)
  const clientName = 'ACME Factory';
  let client = await prisma.client.findFirst({ where: { name: clientName, companyId: company.id } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: clientName,
        type: 'OTHER' as any, // required enum field — use default OTHER for seed
        companyId: company.id,
      },
    });
  }

  const existingContract = await prisma.clientContract.findFirst({
    where: { clientId: client.id, companyId: company.id },
  });

  let contract;
  if (!existingContract) {
    contract = await prisma.clientContract.create({
      data: {
        clientId: client.id,
        contractNumber: `CTR-${Date.now()}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6), // +6 months
        companyId: company.id,
        serviceRates: {
          create: [
            {
              serviceId: guardService.id,
              basePay: 1000 as any,
              extraPay: 200 as any,
              clientPrice: 1500 as any,
            },
            {
              serviceId: cookingService.id,
              basePay: 800 as any,
              extraPay: 100 as any,
              clientPrice: 1200 as any,
            },
            {
              serviceId: cleaningService.id,
              basePay: 600 as any,
              extraPay: 50 as any,
              clientPrice: 900 as any,
            },
          ],
        },
      },
      include: { serviceRates: true },
    });
  } else {
    contract = existingContract;
  }

  console.log('Client + contract ensured');

  // 8) Mission referencing the contract, managerId is adminUser.id
  const missionStart = new Date();
  missionStart.setDate(missionStart.getDate() - 20);
  const missionEnd = new Date();
  missionEnd.setDate(missionEnd.getDate() - 10);

  let mission = await prisma.mission.findFirst({
    where: {
      contractId: contract.id,
      location: 'ACME — Main Gate',
      startDate: missionStart,
    },
  });

  if (!mission) {
    mission = await prisma.mission.create({
      data: {
        contractId: contract.id,
        location: 'ACME — Main Gate',
        startDate: missionStart,
        endDate: missionEnd,
        requiredPersonnel: 5,
        extraPersonnelSlots: 1,
        managerId: adminUser.id,
        companyId: company.id,
        requirements: {
          create: [
            { serviceId: guardService.id, requiredCount: 3 },
            { serviceId: cookingService.id, requiredCount: 2 },
          ],
        },
      },
      include: { requirements: true },
    });
  }

  // 9) Assign personnel to mission
  async function safeAssign(personnelId: number, missionId: number, post: string | null = null, isReplacement = false) {
    const exists = await prisma.missionAssignment.findFirst({
      where: { personnelId, missionId },
    });
    if (exists) return exists;
    return prisma.missionAssignment.create({
      data: {
        missionId,
        personnelId,
        post: post ?? undefined,
        isReplacement,
      },
    });
  }

  await safeAssign(john.id, mission.id, 'Post1', false);
  await safeAssign(amy.id, mission.id, 'Kitchen1', false);
  await safeAssign(sana.id, mission.id, 'Clean1', false);

  console.log('Assignments ensured');

  // 10) Create attendance sample records (two days)
  const attendanceDate1 = new Date(missionStart);
  const attendanceDate2 = new Date(missionStart);
  attendanceDate2.setDate(attendanceDate2.getDate() + 1);

  async function createAttendanceIfMissing(assignmentId: number, date: Date, personnelId: number, status: string) {
    const exists = await prisma.attendance.findFirst({
      where: { assignmentId, date },
    });
    if (exists) return exists;
    return prisma.attendance.create({
      data: {
        assignmentId,
        date,
        status: status as any,
        personnelId,
      },
    });
  }

  const assignments = await prisma.missionAssignment.findMany({ where: { missionId: mission.id } });
  for (const a of assignments) {
    await createAttendanceIfMissing(a.id, attendanceDate1, a.personnelId, 'PRESENT');
    await createAttendanceIfMissing(a.id, attendanceDate2, a.personnelId, 'PRESENT');
  }

  console.log('Attendance sample records created');

  // 11) Simple billing generation for the mission period
  const periodStart = mission.startDate;
  const periodEnd = mission.endDate;

  const missionAssignments = await prisma.missionAssignment.findMany({
    where: { missionId: mission.id },
    include: { personnel: { include: { service: true } } },
  });

  const countsByService = new Map<number, number>();
  for (const a of missionAssignments) {
    const svcId = a.personnel?.serviceId;
    if (!svcId) continue;
    countsByService.set(svcId, (countsByService.get(svcId) || 0) + 1);
  }

  // create billing header
  const invoiceNumber = `INV-${Date.now()}`;
  const billing = await prisma.billing.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      contractId: contract.id,
      generatedById: adminUser.id,
      invoiceNumber,
      periodStart,
      periodEnd,
      invoiceDate: new Date(),
      status: 'DRAFT' as any,
      amountBaseCurrency: 0 as any,
    },
  });

  let totalBase = 0;
  const contractRates = await prisma.clientContractService.findMany({ where: { clientContractId: contract.id } });

  for (const rate of contractRates) {
    const svcId = rate.serviceId;
    const count = countsByService.get(svcId) || 0;
    if (count === 0) continue;
    const qty = count;
    const unitPrice = Number(rate.clientPrice);
    const lineTotal = unitPrice * qty;
    await prisma.billingLine.create({
      data: {
        billingId: billing.id,
        lineType: 'SERVICE',
        description: `Service: ${svcId}`,
        serviceId: svcId,
        contractId: contract.id,
        personnelCount: qty,
        quantity: qty,
        unitPriceBase: unitPrice as any,
        lineTotalBase: lineTotal as any,
        totalAfterDiscountBase: lineTotal as any,
      },
    });
    totalBase += lineTotal;
  }

  await prisma.billing.update({ where: { id: billing.id }, data: { amountBaseCurrency: totalBase as any } });

  console.log(`Billing created invoiceNumber=${invoiceNumber} total=${totalBase}`);

  console.log('Seed finished successfully');
}

main()
  .catch((e) => {
    console.error('Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
