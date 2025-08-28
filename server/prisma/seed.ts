import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { name: 'Default Company' },
    update: {},
    create: { name: 'Default Company', baseCurrency: 'USD' },
  });

  const permissions = [
    { name: 'guards.read', description: 'View guards list' },
    { name: 'guards.manage', description: 'Create/edit/delete guards' },
    { name: 'attendance.read', description: 'View attendance sheets' },
    { name: 'attendance.edit', description: 'Edit attendance cells' },
    { name: 'missions.read', description: 'View missions' },
    { name: 'missions.manage', description: 'Manage missions' },
    { name: 'clients.read', description: 'View clients' },
    { name: 'clients.manage', description: 'Manage clients & contracts' },
    { name: 'billing.read', description: 'View billing' },
    { name: 'billing.generate', description: 'Generate invoices' },
    { name: 'company.manage', description: 'Company admin' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({ where: { name: p.name }, update: {}, create: p });
  }

  const roleMap: Record<string, string[]> = {
    ADMIN: ['company.manage','billing.generate','billing.read','guards.manage','attendance.edit','clients.manage','missions.manage'],
    MANAGER: ['missions.manage','attendance.edit','guards.read','missions.read'],
    ACCOUNTANT: ['billing.read','billing.generate','attendance.read'],
    COMMERCIAL: ['clients.manage','missions.read','guards.read'],
    GUARD: ['attendance.read','missions.read'],
  };

  for (const [roleName, permNames] of Object.entries(roleMap)) {
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleName_permissionId: { roleName, permissionId: perm.id } },
        update: {},
        create: { roleName, permissionId: perm.id },
      });
    }
  }

  const adminIdentifier = 'admin';
  const adminPassword = 'adminpass';
  const hashed = await bcrypt.hash(adminPassword, 10);

  const existing = await prisma.user.findUnique({ where: { identifier: adminIdentifier } });
  if (!existing) {
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        identifier: adminIdentifier,
        password: hashed,
        role: 'ADMIN',
        displayname: 'Administrator',
      },
    });
    console.log('Created admin user:', user.id, 'identifier:', adminIdentifier);
  } else {
    console.log('Admin already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
