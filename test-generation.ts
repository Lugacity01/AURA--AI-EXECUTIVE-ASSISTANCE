import { PrismaClient } from '@prisma/client';
import OpenAI from "openai";

const prisma = new PrismaClient();

async function run() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { template: true, recipients: true }
  });
  console.dir(campaigns, { depth: null });
  
  if (campaigns.length > 0) {
    console.log("Template:", campaigns[0].template);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
