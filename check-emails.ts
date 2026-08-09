import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emails = await prisma.email.findMany({
    where: { userId: '17S3vAxAjj9HqKd69Qyzfucp3dUX8RMY' },
    orderBy: { receivedAt: 'desc' },
    take: 10,
    select: { id: true, subject: true, labelIds: true, status: true, receivedAt: true, from: true }
  });
  console.log(emails);
}

main().catch(console.error).finally(() => prisma.$disconnect());
