import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const queue = await prisma.campaignQueue.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  
  console.log("Queue Job Status:", queue[0]?.status);
  console.log("Queue Job Error:", queue[0]?.lastError);
}

main().catch(console.error).finally(() => prisma.$disconnect())
