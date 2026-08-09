import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.email.findMany({
    where: { from: { contains: 'olamide', mode: 'insensitive' } },
    orderBy: { receivedAt: 'desc' },
    select: { id: true, subject: true, status: true, from: true, labelIds: true }
  });
  console.log(emails);
}

main().catch(console.error).finally(() => prisma.$disconnect());
