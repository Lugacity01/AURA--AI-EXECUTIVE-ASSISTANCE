const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting authentication database reset...");
  
  // Clean up Better Auth collections
  const sessionCount = await prisma.session.deleteMany({});
  console.log(`Deleted ${sessionCount.count} sessions.`);
  
  const accountCount = await prisma.account.deleteMany({});
  console.log(`Deleted ${accountCount.count} accounts.`);
  
  const verificationCount = await prisma.verification.deleteMany({});
  console.log(`Deleted ${verificationCount.count} verification records.`);

  const userCount = await prisma.user.deleteMany({});
  console.log(`Deleted ${userCount.count} users.`);
  
  console.log("Authentication database reset completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error resetting authentication database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
