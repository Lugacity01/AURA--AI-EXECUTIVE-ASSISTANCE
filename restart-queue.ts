import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.campaignQueue.updateMany({
    where: { 
      status: "QUEUED",
      attempts: { gt: 0 }
    },
    data: {
      attempts: 0,
      nextRunAt: new Date()
    }
  });
  console.log("Queue reset!");
  
  // Actually, wait, let's just trigger the queue process by calling the service
  // But since we can't easily run it persistently here, we just reset the time
  // so if they launch anything else or if there's any trigger, it runs.
  // Wait, I will just run a small worker script to process it right now!
}

main().catch(console.error).finally(() => prisma.$disconnect())
