// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: starting...');

  // 1) ensure company exists (safe findFirst -> create)
  const companyName = 'Default Company';
  let company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        baseCurrency: 'USD',
        address: 'Local Dev',
      },
    });
    console.log('Created company id=', company.id);
  } else {
    console.log('Found company id=', company.id);
  }

  // 2) upsert permissions (safe - upsert by unique name)
  const permissions = [
    { name: 'guards.read', description: 'View guards list' },
    { name: 'guards.manage', description: 'Create/edit/delete guards' },
    { name: 'attendance.read', description: 'View attendance sheets' },
    { name: 'attendance.edit', description: 'Edit attendance cells' },
    { name: 'missions.read', description: 'View missions' },
    { name: 'missions.manage', description: 'Manage missions and assignments' },
    { name: 'clients.read', description: 'View clients' },
    { name: 'clients.manage', description: 'Manage clients & contracts' },
    { name: 'billing.read', description: 'View billing/invoices' },
    { name: 'billing.generate', description: 'Generate invoices' },
    { name: 'company.manage', description: 'Company admin' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description ?? undefined },
      create: p,
    });
  }
  console.log('Permissions upserted.');

  // 3) role -> permission mappings (safe create if missing)
  const roleMap: Record<string, string[]> = {
    ADMIN: [
      'company.manage',
      'billing.generate',
      'billing.read',
      'guards.manage',
      'attendance.edit',
      'clients.manage',
      'missions.manage',
    ],
    MANAGER: ['missions.manage', 'attendance.edit', 'guards.read', 'missions.read'],
    ACCOUNTANT: ['billing.read', 'billing.generate', 'attendance.read'],
    COMMERCIAL: ['clients.manage', 'missions.read', 'guards.read'],
    GUARD: ['attendance.read', 'missions.read'],
  };

  for (const [roleName, permNames] of Object.entries(roleMap)) {
    for (const permName of permNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;

      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleName,
          permissionId: perm.id,
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: { roleName, permissionId: perm.id },
        });
      }
    }
  }
  console.log('Role -> permission mappings ensured.');

  // 4) create admin user (identifier + hashed password)
  const adminIdentifier = process.env.SEED_ADMIN_IDENTIFIER || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'adminpass';
  const hashed = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({ where: { identifier: adminIdentifier } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        companyId: company.id,
        identifier: adminIdentifier,
        password: hashed,
        role: 'ADMIN',
      },
    });
    console.log('Admin user created:', adminIdentifier);
  } else {
    console.log('Admin user exists, skipping creation:', adminIdentifier);
  }

  console.log('Seed finished.');
}

main()
  .catch((e) => {
    console.error('Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
