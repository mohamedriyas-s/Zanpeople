import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing mock transactional data...');

  // Delete all mock candidates (which automatically deletes applications, stage progress, tasks, interviews due to Cascade)
  await prisma.candidate.deleteMany();
  console.log('✅ Candidates cleared');

  // Delete all mock jobs
  await prisma.jobOpening.deleteMany();
  console.log('✅ Job Openings cleared');

  // Delete all mock employees
  await prisma.employee.deleteMany();
  console.log('✅ Employees cleared');

  // Clear public access logs and notifications just in case
  await prisma.publicAccessLog.deleteMany();
  await prisma.notification.deleteMany();
  console.log('✅ Logs & Notifications cleared');

  console.log('\n🎉 Database is clean! Admin & HR logins, Skills, and Pipeline Templates have been kept intact.');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
