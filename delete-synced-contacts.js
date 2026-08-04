require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.contact.deleteMany({
      where: {
        notes: "Aura connected. Auto-generated via inbox sync."
      }
    });
    console.log(`Successfully deleted ${result.count} auto-generated contacts.`);
  } catch (e) {
    console.error('Failed to delete contacts:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
