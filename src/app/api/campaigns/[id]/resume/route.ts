import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";
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

    // Reset or recreate queue job for this campaign
    await prisma.campaignQueue.deleteMany({
      where: { campaignId: id }
    });

    await prisma.campaignQueue.create({
      data: {
        campaignId: id,
        status: "QUEUED",
        attempts: 0,
        nextRunAt: new Date(),
        lastError: null
      }
    });

    // Reset failed recipients back to PENDING and APPROVED so user can retry sending
    await prisma.campaignRecipient.updateMany({
      where: {
        campaignId: id,
        sendStatus: "FAILED"
      },
      data: {
        approvalStatus: "APPROVED",
        sendStatus: "PENDING",
        failedReason: null
      }
    });

    // Recalculate accurate counts directly from DB
    const sentCount = await prisma.campaignRecipient.count({ where: { campaignId: id, sendStatus: "SENT" } });
    const failedCount = await prisma.campaignRecipient.count({ where: { campaignId: id, sendStatus: "FAILED" } });

    // Reset campaign status to SENDING and update counts
    await prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.SENDING,
        emailsSent: sentCount,
        failedRecipients: failedCount
      }
    });

    // Immediately trigger the queue background processor
    await CampaignQueueService.processQueue();

    return NextResponse.json({ success: true, message: "Campaign force resumed and processing queue." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
