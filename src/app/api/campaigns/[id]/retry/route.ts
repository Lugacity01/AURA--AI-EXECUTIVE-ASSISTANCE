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

    // Reset failed recipients to PENDING
    const result = await prisma.campaignRecipient.updateMany({
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

    if (result.count === 0) {
      return NextResponse.json({ error: "No failed recipients to retry" }, { status: 400 });
    }

    // Recalculate accurate counts directly from DB
    const sentCount = await prisma.campaignRecipient.count({ where: { campaignId: id, sendStatus: "SENT" } });
    const failedCount = await prisma.campaignRecipient.count({ where: { campaignId: id, sendStatus: "FAILED" } });

    await prisma.campaign.update({
      where: { id },
      data: {
        emailsSent: sentCount,
        failedRecipients: failedCount
      }
    });

    // Re-schedule the campaign via the queue service
    await CampaignQueueService.scheduleCampaign(id, session.user.id);

    return NextResponse.json({ success: true, retriedCount: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
