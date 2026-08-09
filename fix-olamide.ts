import { PrismaClient } from '@prisma/client';
import { DraftService } from './src/services/draft.service';
const prisma = new PrismaClient();

async function main() {
  const email = await prisma.email.findUnique({ where: { id: '6a785759144de54e0cee8228' }});
  if (!email) return;

  // Use the actual DraftService to generate the AI draft properly via OpenAI
  await DraftService.generateDraftForEmail(email.id, email.userId);

  await prisma.email.update({
    where: { id: email.id },
    data: { status: 'NEEDS_APPROVAL' }
  });

  console.log("Fixed Olamide's email");
}

main().catch(console.error).finally(() => prisma.$disconnect());
