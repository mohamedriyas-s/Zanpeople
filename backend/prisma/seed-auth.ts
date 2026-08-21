import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding authentication users...\n');

  const adminHash = await bcrypt.hash('Zansphere@admin123', 10);
  const hrHash = await bcrypt.hash('Zansphere@hr456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@zansphere.com' },
    update: {},
    create: {
      name: 'Zansphere Admin',
      email: 'admin@zansphere.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user: admin@zansphere.com');

  await prisma.user.upsert({
    where: { email: 'hr@zansphere.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'hr@zansphere.com',
      passwordHash: hrHash,
      role: UserRole.HR,
    },
  });
  console.log('✅ HR user: hr@zansphere.com');

  console.log('\n🎉 Auth seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
