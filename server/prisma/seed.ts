// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seed');

  // -----------------------------
  // 1) Company
  // -----------------------------
  const companyName = 'Default Company';
  let company = await prisma.company.findUnique({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        baseCurrency: 'USD',
        address: '123 Default St, Capital City',
        email: 'info@defaultcompany.local',
        phone: '+1-555-0100',
      },
    });
    console.log('Created company:', companyName);
  } else {
    console.log('Company exists:', companyName);
  }

  // -----------------------------
  // 2) Permissions (canonical set)
  // -----------------------------
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
    { name: 'attendance.manage', description: 'manage attendence' },
  ];

  for (const p of perms) {
    const existing = await prisma.permission.findUnique({ where: { name: p.name } });
    if (!existing) {
      await prisma.permission.create({ data: p });
    }
  }
  console.log('Permissions ensured');

  const allPermNames = perms.map((p) => p.name);

  // -----------------------------
  // 3) Role -> permission mappings (keep as-is)
  // -----------------------------
  const roleMap: Record<string, string[]> = {
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

  // -----------------------------
  // 4) Services
  // -----------------------------
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
    description: 'Armed / Unarmed security guards (24/7 coverage)',
    defaultBasePay: 1000,
    defaultExtraPay: 200,
    defaultClientPrice: 1500,
  });

  const cookingService = await ensureService({
    code: 'COOK',
    name: 'Cooking Service',
    description: 'Kitchen staff and catering support',
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

  // -----------------------------
  // 5) Personnel
  // -----------------------------
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

  const marc = await ensurePersonnel({
    firstName: 'Marc',
    lastName: 'Backup',
    email: 'marc.backup@example.com',
    baseSalary: 950,
    serviceId: guardService.id,
  });

  console.log('Personnel ensured');

  // -----------------------------
  // 6) Personnel contracts (simple examples)
  // -----------------------------
  async function ensurePersonnelContract(personnelId: number, contractNumber: string, start: Date, end: Date) {
    const existing = await prisma.personnelContract.findFirst({
      where: { personnelId, contractNumber },
    });
    if (existing) return existing;
    return prisma.personnelContract.create({
      data: {
        personnelId,
        contractNumber,
        startDate: start,
        endDate: end,
      },
    });
  }

  const pContract1 = await ensurePersonnelContract(john.id, 'PCTR-JOHN-001', new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), new Date(Date.now() + 1000 * 60 * 60 * 24 * 275));
  const pContract2 = await ensurePersonnelContract(amy.id, 'PCTR-AMY-001', new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), new Date(Date.now() + 1000 * 60 * 60 * 24 * 305));
  console.log('Personnel contracts ensured');

  // -----------------------------
  // 7) Users (admin + sample roles)
  // -----------------------------
  async function ensureUser(identifier: string, displayname: string, role: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { identifier } });
    if (existing) return existing;
    const hash = await bcrypt.hash(password, 10);
    return prisma.user.create({
      data: {
        companyId: 1,
        identifier,
        displayname,
        password: hash,
        role: role as any,
      },
    });
  }

  const adminUser = await ensureUser('admin', 'Administrator', 'ADMIN', 'adminpass');
  const managerUser = await ensureUser('manager1', 'Manager One', 'MANAGER', 'managerpass');
  const accountantUser = await ensureUser('accountant1', 'Accountant One', 'ACCOUNTANT', 'accountantpass');
  const commercialUser = await ensureUser('commercial1', 'Commercial One', 'COMMERCIAL', 'commercialpass');

  console.log('Users ensured');

  // Grant explicit user permissions to admin (if not present)
  for (const permName of allPermNames) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
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
    }
  }
  console.log('Admin user permissions ensured');

  // -----------------------------
  // 8) Clients, Cities, Sites
  // -----------------------------
  async function ensureCity(name: string, state?: string, country?: string) {
    const existing = await prisma.city.findFirst({ where: { name, state: state ?? undefined, country: country ?? undefined } });
    if (existing) return existing;
    return prisma.city.create({
      data: {
        name,
        state,
        country: country ?? 'Country Name',
      },
    });
  }

  const cityA = await ensureCity('Springfield', 'State A', 'Freedonia');
  const cityB = await ensureCity('Rivertown', 'State B', 'Freedonia');

  async function ensureClient(name: string, type: string) {
    const existing = await prisma.client.findFirst({ where: { name, companyId: company.id } });
    if (existing) return existing;
    return prisma.client.create({
      data: { name, type: type as any, companyId: 1 },
    });
  }

  const acme = await ensureClient('ACME Factory', 'OTHER');
  const beta = await ensureClient('Beta Logistics', 'OTHER');
  const gamma = await ensureClient('Gamma Bank', 'BANK');

  async function ensureSite(clientId: number, name: string, address: string, city: typeof cityA | typeof cityB) {
    const existing = await prisma.site.findFirst({ where: { clientId, name } });
    if (existing) return existing;
    const site = await prisma.site.create({
      data: {
        clientId,
        name,
        address,
        countryCode: city.country,
        stateCode: city.state ?? undefined,
      },
    });
    // link city -> site via CityToSite relation (City has relation to sites)
    await prisma.city.update({
      where: { id: city.id },
      data: { sites: { connect: { id: site.id } } as any },
    });
    return site;
  }

  const acmeSite1 = await ensureSite(acme.id, 'ACME Main Plant', '1 Industrial Way', cityA);
  const betaSite1 = await ensureSite(beta.id, 'Beta Warehouse', '5 Dock Road', cityB);
  const gammaSite1 = await ensureSite(gamma.id, 'Gamma Downtown Branch', '100 Bank St', cityA);

  console.log('Clients, cities, sites ensured');

  // -----------------------------
  // 9) Client contract + per-site services (with pricing & counts)
  // -----------------------------
  const existingContract = await prisma.clientContract.findFirst({
    where: { clientId: acme.id, companyId: company.id },
  });

  let contract;
  if (!existingContract) {
    contract = await prisma.clientContract.create({
      data: {
        clientId: acme.id,
        contractNumber: `CTR-ACME-${new Date().toISOString().slice(0,10)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6), // +6 months
        companyId: company.id,
        status: 'CONFIRMED',
        submittedById: managerUser.id,
        submittedAt: new Date(),
        confirmedById: adminUser.id,
        confirmedAt: new Date(),
      },
    });
    console.log('Client contract created for ACME');
  } else {
    contract = existingContract;
    console.log('Existing ACME contract used');
  }

  // create contract site (ACME Main Plant)
  const existingContractSite = await prisma.clientContractSite.findFirst({
    where: { clientContractId: contract.id, siteId: acmeSite1.id },
  });
  let contractSite;
  if (!existingContractSite) {
    contractSite = await prisma.clientContractSite.create({
      data: {
        clientContractId: contract.id,
        siteId: acmeSite1.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6), // +6 months
      },
    });
  } else {
    contractSite = existingContractSite;
  }

  // For that contract site add service rows
  async function ensureContractSiteService(contractSiteId: number, serviceId: number, requiredCount: number, basePay: number, extraPay: number, clientPrice: number) {
    const existing = await prisma.clientContractSiteService.findFirst({
      where: { contractSiteId, serviceId },
    });
    if (existing) return existing;
    return prisma.clientContractSiteService.create({
      data: {
        contractSiteId,
        serviceId,
        requiredCount,
        basePay: basePay as any,
        extraPay: extraPay as any,
        clientPrice: clientPrice as any,
      },
    });
  }

  const cssGuard = await ensureContractSiteService(contractSite.id, guardService.id, 3, 1000, 200, 1500);
  const cssClean = await ensureContractSiteService(contractSite.id, cleaningService.id, 2, 600, 50, 900);

  console.log('Client contract site services ensured');

  // -----------------------------
  // 10) Assignments (attach personnel to contract site service)
  // -----------------------------
  async function ensureAssignment(contractSiteServiceId: number, postIndex: number, personnelId: number | null, start: Date, end: Date, createdById?: number) {
    const existing = await prisma.assignment.findFirst({
      where: {
        contractSiteServiceId,
        postIndex,
        personnelId: personnelId ?? undefined,
      },
    });
    if (existing) return existing;
    return prisma.assignment.create({
      data: {
        contractSiteServiceId,
        postIndex,
        personnelId: personnelId ?? undefined,
        startDate: start,
        endDate: end,
        createdById: createdById ?? adminUser.id,
      },
    });
  }

  const assign1 = await ensureAssignment(cssGuard.id, 1, john.id, new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30));
  const assign2 = await ensureAssignment(cssGuard.id, 2, marc.id, new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30));
  const assign3 = await ensureAssignment(cssClean.id, 1, sana.id, new Date(), new Date(Date.now() + 1000 * 60 * 60 * 24 * 30));

  console.log('Assignments ensured');

  // -----------------------------
  // 11) Attendance for assignments (a few sample days)
  // -----------------------------
  async function createAttendanceIfMissing(assignmentId: number, date: Date, status: string) {
    const exists = await prisma.attendance.findFirst({ where: { assignmentId, date } });
    if (exists) return exists;
    return prisma.attendance.create({
      data: {
        assignmentId,
        date,
        status: status as any,
      },
    });
  }

  const attendanceDates = [
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  ];

  for (const d of attendanceDates) {
    await createAttendanceIfMissing(assign1.id, d, 'PRESENT');
    await createAttendanceIfMissing(assign2.id, d, 'PRESENT');
    await createAttendanceIfMissing(assign3.id, d, 'ABSENT');
  }

  console.log('Sample attendance created');

  // -----------------------------
  // 12) Billing (generate a sample invoice for the contract period)
  // -----------------------------
  async function ensureBilling(invoiceNumber: string, clientId: number, companyId: number, contractId: number | null, periodStart: Date, periodEnd: Date) {
    const existing = await prisma.billing.findFirst({
      where: { companyId, invoiceNumber },
    });
    if (existing) return existing;
    return prisma.billing.create({
      data: {
        invoiceNumber,
        companyId,
        clientId,
        contractId: contractId ?? undefined,
        periodStart,
        periodEnd,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // +30d
        amountBaseCurrency: 0 as any,
        status: 'DRAFT',
      },
    });
  }

  const invoice = await ensureBilling(`INV-${new Date().toISOString().slice(0,10)}-001`, acme.id, company.id, contract.id, new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), new Date());

  // Create billing lines for each contract site service (reflect clientPrice * requiredCount)
  const existingLines = await prisma.billingLine.findMany({ where: { billingId: invoice.id } });
  if (existingLines.length === 0) {
    const linesToCreate = [];

    // Guard lines (3 posts)
    linesToCreate.push({
      billingId: invoice.id,
      lineType: 'SERVICE' as any,
      description: 'Guard Service - ACME Main Plant (monthly)',
      missionServiceId: null,
      personnelId: null,
      serviceId: guardService.id,
      personnelCount: 3,
      quantity: 1,
      unitPriceBase: 1500 as any,
      lineTotalBase: (1500 * 3) as any,
      totalAfterDiscountBase: (1500 * 3) as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Cleaning lines (2 posts)
    linesToCreate.push({
      billingId: invoice.id,
      lineType: 'SERVICE' as any,
      description: 'Cleaning Service - ACME Main Plant (monthly)',
      serviceId: cleaningService.id,
      personnelCount: 2,
      quantity: 1,
      unitPriceBase: 900 as any,
      lineTotalBase: (900 * 2) as any,
      totalAfterDiscountBase: (900 * 2) as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const l of linesToCreate) {
      await prisma.billingLine.create({ data: l as any });
    }

    // update invoice total
    const aggregated = await prisma.billingLine.findMany({ where: { billingId: invoice.id } });
    const sum = aggregated.reduce((s, cur) => s + Number((cur.lineTotalBase as any) ?? 0), 0);
    await prisma.billing.update({ where: { id: invoice.id }, data: { amountBaseCurrency: sum as any } });
  }

  console.log('Billing + lines ensured');

  // Add a payment record (partial)
  const paymentExists = await prisma.payment.findFirst({ where: { billingId: invoice.id } });
  if (!paymentExists) {
    await prisma.payment.create({
      data: {
        billingId: invoice.id,
        amount: (Number(invoice.amountBaseCurrency ?? 0) * 0.5) as any,
        currency: company.baseCurrency,
        paidAt: new Date(),
        method: 'Bank Transfer',
        reference: 'TXN-0001',
      },
    });
    await prisma.billing.update({ where: { id: invoice.id }, data: { status: 'PENDING' } });
    console.log('Payment recorded for invoice');
  }

  // -----------------------------
  // 13) Audit logs (some simple records)
  // -----------------------------
  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    const now = new Date();
    const logs = [
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        previousData: null,
        newData: { name: company.name },
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        userId: managerUser.id,
        action: 'CREATE',
        entity: 'Client',
        entityId: acme.id,
        previousData: null,
        newData: { name: acme.name },
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8),
      },
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'ClientContract',
        entityId: contract.id,
        previousData: null,
        newData: { contractNumber: contract.contractNumber },
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
      },
    ];
    for (const l of logs) {
      await prisma.auditLog.create({ data: l as any });
    }
    console.log('Audit logs created');
  } else {
    console.log('Audit logs already exist');
  }

  console.log('Seed finished successfully');
}

main()
  .catch((e) => {
    console.error('Seed error', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
