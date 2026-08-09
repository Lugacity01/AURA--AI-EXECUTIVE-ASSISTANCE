import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { recipients: true } } }
  });
  
  for (const c of campaigns) {
    console.log(`Campaign: ${c.title}, totalRecipients field: ${c.totalRecipients}, actual recipients: ${c._count.recipients}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
