// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seed');

  // 1) Company
  const companyName = 'Default Company';
  let company = await prisma.company.findUnique({
    where: { name: companyName },
  });
  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName, baseCurrency: 'USD' },
    });
    console.log('Created company:', companyName);
  } else {
    console.log('Company exists:', companyName);
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
    { name: 'billing.manage', description: 'Create/edit billings' },
    { name: 'company.manage', description: 'Company-wide admin' },
    { name: 'company.read', description: 'Company-wide read' },
    { name: 'client.read', description: 'View clients' },
    { name: 'client.manage', description: 'Create/edit clients' },
    { name: 'locations.manage', description: 'Create/edit locations' },
    { name: 'locations.read', description: 'view locations' },
    { name: 'contracts.create', description: 'Create contract' },
    { name: 'contracts.read', description: 'View contracts' },
    { name: 'contracts.manage', description: 'Create/edit contracts' },
    { name: 'contracts.confirm', description: 'confirm contracts' },
    { name: 'notifications.read', description: 'read notifications' },
    { name: 'sites.read', description: 'read sites' },
    { name: 'sites.manage', description: 'manage sites' },
  ];

  // Ensure each permission exists
  for (const p of perms) {
    const existing = await prisma.permission.findUnique({
      where: { name: p.name },
    });
    if (!existing) {
      await prisma.permission.create({ data: p });
    }
  }
  console.log('Permissions ensured');

  // collect all permission names once so ADMIN can get them automatically
  const allPermNames = perms.map((p) => p.name);

  // 3) Role -> permission mappings
  const roleMap: Record<string, string[]> = {
    // ADMIN now uses all permissions automatically
    ADMIN: allPermNames,
    MANAGER: [
      'missions.manage',
      'attendance.edit',
      'personnel.read',
      'missions.read',
      'locations.read',
      'locations.manage',
    ],
    ACCOUNTANT: [
      'billing.read',
      'billing.generate',
      'attendance.read',
      'locations.read',
      'locations.manage',
    ],
    COMMERCIAL: [
      'services.manage',
      'missions.read',
      'personnel.read',
      'locations.read',
      'locations.manage',
    ],
  };

  for (const [roleName, permNames] of Object.entries(roleMap)) {
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({
        where: { name: permName },
      });
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

  // 4) Services
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
      const found = await prisma.personnel.findUnique({
        where: { email: data.email },
      });
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

  // 6) Admin user
  const adminIdentifier = 'admin';
  const adminPassword = 'adminpass';
  let adminUser = await prisma.user.findUnique({
    where: { identifier: adminIdentifier },
  });
  console.log(adminPassword);

  if (!adminUser) {
    const hash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        companyId: company.id,
        identifier: adminIdentifier,
        displayname: 'Administrator',
        password: hash,
        role: 'ADMIN' as any,
      },
    });
    console.log('Admin user created (identifier=admin)');
  } else {
    console.log('Admin user exists (identifier=admin)');
  }

  // Grant explicit user permissions to admin (if not present)
  // Automatically grant every permission in `perms` to the admin user
  const adminExplicitPerms = allPermNames;

  for (const permName of adminExplicitPerms) {
    const perm = await prisma.permission.findUnique({
      where: { name: permName },
    });
    if (!perm) continue;
    const existingUP = await prisma.userPermission.findFirst({
      where: { userId: adminUser.id, permissionId: perm.id },
    });
    if (!existingUP) {
      await prisma.userPermission.create({
        data: {
          userId: adminUser.id,
          permissionId: perm.id,
          grantedById: adminUser.id,
        },
      });
      console.log(`Granted permission "${permName}" to admin`);
    }
  }

  // 7) Client & Contract
  const clientName = 'ACME Factory';
  let client = await prisma.client.findFirst({
    where: { name: clientName, companyId: company.id },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: clientName,
        type: 'OTHER' as any,
        companyId: company.id,
      },
    });
    console.log('Client created:', clientName);
  } else {
    console.log('Client exists:', clientName);
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
    console.log('Client contract created');
  } else {
    contract = existingContract;
    console.log('Existing contract used');
  }

  // 8) Mission
  const missionStart = new Date();
  missionStart.setDate(missionStart.getDate() - 20);
  const missionEnd = new Date();
  missionEnd.setDate(missionEnd.getDate() - 10);

  let mission = await prisma.mission.findFirst({
    where: { contractId: contract.id, startDate: missionStart },
  });

  if (!mission) {
    mission = await prisma.mission.create({
      data: {
        contractId: contract.id,
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
    console.log('Mission created');
  } else {
    console.log('Mission exists');
  }

  // 9) Assign personnel
  async function safeAssign(
    personnelId: number,
    missionId: number,
    post: string | null = null,
    isReplacement = false,
  ) {
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

  // 10) Attendance sample
  const attendanceDate1 = new Date(missionStart);
  const attendanceDate2 = new Date(missionStart);
  attendanceDate2.setDate(attendanceDate2.getDate() + 1);

  async function createAttendanceIfMissing(
    assignmentId: number,
    date: Date,
    personnelId: number,
    status: string,
  ) {
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

  const assignments = await prisma.missionAssignment.findMany({
    where: { missionId: mission.id },
  });
  for (const a of assignments) {
    await createAttendanceIfMissing(
      a.id,
      attendanceDate1,
      a.personnelId,
      'PRESENT',
    );
    await createAttendanceIfMissing(
      a.id,
      attendanceDate2,
      a.personnelId,
      'PRESENT',
    );
  }

  console.log('Attendance sample records created');

  // 11) Basic billing generation for the mission period
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
  const contractRates = await prisma.clientContractService.findMany({
    where: { clientContractId: contract.id },
  });

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
        lineType: 'SERVICE' as any,
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

  await prisma.billing.update({
    where: { id: billing.id },
    data: { amountBaseCurrency: totalBase as any },
  });
  console.log(
    `Billing created invoiceNumber=${invoiceNumber} total=${totalBase}`,
  );

  console.log('Seed finished successfully');
  createStaticAuditLogs(company);
}
// Update the createStaticAuditLogs function with proper typing
async function createStaticAuditLogs(company: any) {
  interface AuditLogData {
    action: string;
    entity: string;
    entityId: number;
    previousData: any;
    newData: any;
  }

  const staticAuditLogs: AuditLogData[] = [
    {
      action: 'CREATE',
      entity: 'Service',
      entityId: 1,
      previousData: {
        name: 'Guard Service 1',
        code: 'GUARD',
        companyId: company.id,
        description: 'Security service',
      },
      newData: {
        name: 'Guard Service 1',
        code: 'GUARD',
        companyId: company.id,
        description: 'Security service',
      },
    },
    {
      action: 'CREATE',
      entity: 'Service',
      entityId: 2,
      previousData: {
        name: 'Cleaning Service',
        code: 'CLEAN',
        companyId: company.id,
        description: 'Cleaning service',
      },
      newData: {
        name: 'Cleaning Service',
        code: 'CLEAN',
        companyId: company.id,
        description: 'Cleaning service',
      },
    },
    {
      action: 'UPDATE',
      entity: 'Service',
      entityId: 1,
      previousData: {
        name: 'Guard Service',
        code: 'GUARD',
        description: 'Security service',
      },
      newData: {
        name: 'Premium Guard Service',
        code: 'PGUARD',
        description: 'Premium security service',
      },
    },
    {
      action: 'CREATE',
      entity: 'Personnel',
      entityId: 1,
      previousData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        companyId: company.id,
      },
      newData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        companyId: company.id,
      },
    },
    {
      action: 'CREATE',
      entity: 'Personnel',
      entityId: 2,
      previousData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        companyId: company.id,
      },
      newData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        companyId: company.id,
      },
    },
    {
      action: 'UPDATE',
      entity: 'Personnel',
      entityId: 1,
      previousData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      newData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.updated@example.com',
      },
    },
    {
      action: 'DELETE',
      entity: 'Personnel',
      entityId: 2,
      previousData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
      newData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
    },
    {
      action: 'CREATE',
      entity: 'User',
      entityId: 1,
      previousData: {
        identifier: 'admin',
        displayname: 'Administrator',
        companyId: company.id,
      },
      newData: {
        identifier: 'admin',
        displayname: 'Administrator',
        companyId: company.id,
      },
    },
    {
      action: 'UPDATE',
      entity: 'User',
      entityId: 1,
      previousData: { identifier: 'admin', displayname: 'Administrator' },
      newData: { identifier: 'admin', displayname: 'Super Administrator' },
    },
    {
      action: 'DELETE',
      entity: 'User',
      entityId: 2,
      previousData: { identifier: 'manager', displayname: 'Manager' },
      newData: null,
    },
    {
      action: 'CREATE',
      entity: 'Client',
      entityId: 1,
      previousData: {
        name: 'ABC Corporation',
        type: 'COMPANY',
        companyId: company.id,
      },
      newData: {
        name: 'ABC Corporation',
        type: 'COMPANY',
        companyId: company.id,
      },
    },
    {
      action: 'CREATE',
      entity: 'Client',
      entityId: 2,
      previousData: { name: 'XYZ Ltd', type: 'COMPANY', companyId: company.id },
      newData: { name: 'XYZ Ltd', type: 'COMPANY', companyId: company.id },
    },
    {
      action: 'UPDATE',
      entity: 'Client',
      entityId: 1,
      previousData: { name: 'ABC Corporation', type: 'COMPANY' },
      newData: { name: 'ABC Corp International', type: 'ENTERPRISE' },
    },
    {
      action: 'DELETE',
      entity: 'Client',
      entityId: 2,
      previousData: { name: 'XYZ Ltd', type: 'COMPANY' },
      newData: { name: 'XYZ Ltd', type: 'COMPANY' },
    },
    {
      action: 'CREATE',
      entity: 'Mission',
      entityId: 1,
      previousData: {
        name: 'Night Security',
        status: 'PLANNED',
        companyId: company.id,
      },
      newData: {
        name: 'Night Security',
        status: 'PLANNED',
        companyId: company.id,
      },
    },
    {
      action: 'CREATE',
      entity: 'Mission',
      entityId: 2,
      previousData: {
        name: 'Office Cleaning',
        status: 'ACTIVE',
        companyId: company.id,
      },
      newData: {
        name: 'Office Cleaning',
        status: 'ACTIVE',
        companyId: company.id,
      },
    },
    {
      action: 'UPDATE',
      entity: 'Mission',
      entityId: 1,
      previousData: { name: 'Night Security', status: 'PLANNED' },
      newData: { name: 'Night Security Patrol', status: 'ACTIVE' },
    },
    {
      action: 'DELETE',
      entity: 'Mission',
      entityId: 2,
      previousData: { name: 'Office Cleaning', status: 'ACTIVE' },
      newData: { name: 'Office Cleaning', status: 'ACTIVE' },
    },
    {
      action: 'RESTORE',
      entity: 'Personnel',
      entityId: 2,
      previousData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        companyId: company.id,
      },
      newData: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        companyId: company.id,
      },
    },
  ];

  console.log('Creating static audit logs...');

  for (let i = 0; i < staticAuditLogs.length; i++) {
    const logData = staticAuditLogs[i];
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - (staticAuditLogs.length - i));
    const prisma = new PrismaClient();
    await prisma.auditLog.create({
      data: {
        userId: 1,
        action: logData.action,
        entity: logData.entity,
        entityId: logData.entityId,
        previousData: logData.previousData,
        newData: logData.newData,
        timestamp: timestamp,
      },
    });
  }

  console.log(`Created ${staticAuditLogs.length} static audit logs`);
}

main()
  .catch((e) => {
    console.error('Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
