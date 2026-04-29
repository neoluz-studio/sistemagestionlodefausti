import argon2 from 'argon2';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'lodefausti' },
    update: {},
    create: {
      name: 'LodeFausti Congelados',
      slug: 'lodefausti',
      isActive: true,
    },
  });

  const store = await prisma.store.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'CENTRAL' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Casa Central',
      code: 'CENTRAL',
      isActive: true,
    },
  });

  const passwordHash = await argon2.hash('Admin1234!');
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@lodefausti.local' } },
    update: {
      passwordHash,
      username: 'admin',
      fullName: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true,
      storeId: store.id,
    },
    create: {
      tenantId: tenant.id,
      storeId: store.id,
      email: 'admin@lodefausti.local',
      username: 'admin',
      passwordHash,
      fullName: 'Administrador',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
