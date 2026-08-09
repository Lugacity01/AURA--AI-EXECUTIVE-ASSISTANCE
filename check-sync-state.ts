import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.emailConnection.findMany();
  console.log(connections);
}

main().catch(console.error).finally(() => prisma.$disconnect());
