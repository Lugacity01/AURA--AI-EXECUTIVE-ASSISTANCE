import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { recipients: true }
  });
  console.dir(campaigns[0].recipients, { depth: null });
}

run().catch(console.error).finally(() => prisma.$disconnect());
