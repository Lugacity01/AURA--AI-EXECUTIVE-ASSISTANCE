import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CampaignQueueService } from "@/services/contacts/campaign-queue.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Find any queue jobs for this campaign that might be stuck in PROCESSING
    const stuckJobs = await prisma.campaignQueue.findMany({
      where: { campaignId: id, status: "PROCESSING" }
    });

    if (stuckJobs.length > 0) {
      // Reset stuck jobs back to QUEUED
      await prisma.campaignQueue.updateMany({
        where: { campaignId: id, status: "PROCESSING" },
        data: { status: "QUEUED" }
      });
    } else {
      // If no stuck job is found, maybe there is no job at all? 
      // Let's create one if it doesn't exist, just to be safe.
      const queuedJobs = await prisma.campaignQueue.count({
        where: { campaignId: id, status: "QUEUED" }
      });
      if (queuedJobs === 0) {
        await prisma.campaignQueue.create({
          data: {
            campaignId: id,
            status: "QUEUED",
            nextRunAt: new Date()
          }
        });
      }
    }

    // Re-trigger the queue background processor
    CampaignQueueService.processQueue().catch(console.error);

    return NextResponse.json({ success: true, message: "Campaign resumed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
