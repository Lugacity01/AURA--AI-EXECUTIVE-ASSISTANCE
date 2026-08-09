import { CampaignQueueService } from './src/services/contacts/campaign-queue.service';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Processing queue manually...");
  await CampaignQueueService.processQueue();
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect())
