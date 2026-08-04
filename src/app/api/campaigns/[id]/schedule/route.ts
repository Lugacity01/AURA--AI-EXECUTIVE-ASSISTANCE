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

    const { id: campaignId } = await params;
    const body = await request.json();
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Call the queue service to schedule it
    await CampaignQueueService.scheduleCampaign(campaignId, session.user.id, scheduledAt);

    return NextResponse.json({ success: true, message: "Campaign scheduled successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
