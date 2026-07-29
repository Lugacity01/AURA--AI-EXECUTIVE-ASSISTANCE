import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const conn = await prisma.emailConnection.findFirst({ where: { provider: 'GMAIL' }});
  console.log(conn);
}
main()
