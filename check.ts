import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { contact: { name: { contains: "Agbamolayun Francis" } } },
    orderBy: { generatedAt: 'desc' },
  })
  
  if (recipient) {
    console.log("Context saved:", recipient.personalizationContext);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
