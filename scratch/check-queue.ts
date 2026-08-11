import { prisma } from "../src/lib/prisma";

async function main() {
  const jobs = await prisma.campaignQueue.findMany({
    include: {
      campaign: true
    }
  });
  console.log("Queue Jobs:", JSON.stringify(jobs, null, 2));

  const pendingRecipients = await prisma.campaignRecipient.count({
    where: { sendStatus: "PENDING", approvalStatus: "APPROVED" }
  });
  console.log("Pending approved recipients:", pendingRecipients);
}

main().catch(console.error).finally(() => prisma.$disconnect());
