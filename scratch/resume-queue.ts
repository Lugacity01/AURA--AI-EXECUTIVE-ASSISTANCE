import { prisma } from "../src/lib/prisma";
import { CampaignQueueService } from "../src/services/contacts/campaign-queue.service";

async function main() {
  console.log("Checking for stuck jobs...");
  
  // Find jobs stuck in PROCESSING
  const stuckJobs = await prisma.campaignQueue.findMany({
    where: { status: "PROCESSING" }
  });

  if (stuckJobs.length > 0) {
    console.log(`Found ${stuckJobs.length} stuck jobs. Resetting to QUEUED...`);
    await prisma.campaignQueue.updateMany({
      where: { status: "PROCESSING" },
      data: { status: "QUEUED" }
    });
    console.log("Reset successful. Triggering processQueue...");
    
    // Process them using the NEW batched logic!
    await CampaignQueueService.processQueue();
    console.log("Finished processing queue!");
  } else {
    console.log("No stuck jobs found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
