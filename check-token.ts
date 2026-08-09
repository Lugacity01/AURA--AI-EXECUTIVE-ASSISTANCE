import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log("No user");

  const connection = await prisma.emailConnection.findFirst({
    where: { userId: user.id, provider: "GMAIL" }
  });
  
  console.log("Email Connection updatedAt:", connection?.updatedAt);
  console.log("Email Connection isActive:", connection?.isActive);
}

main().catch(console.error).finally(() => prisma.$disconnect())
