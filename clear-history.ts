import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.emailConnection.updateMany({
    where: { emailAddress: 'lugacitytech@gmail.com' },
    data: { lastHistoryId: null }
  });
  console.log("Cleared lastHistoryId for lugacitytech@gmail.com");
}

main().catch(console.error).finally(() => prisma.$disconnect());
