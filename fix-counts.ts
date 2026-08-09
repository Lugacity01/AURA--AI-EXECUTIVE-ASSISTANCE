import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { recipients: true } } }
  });
  
  for (const c of campaigns) {
    if (c.totalRecipients !== c._count.recipients) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { totalRecipients: c._count.recipients }
      });
      console.log(`Fixed Campaign: ${c.title}, set total to ${c._count.recipients}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
