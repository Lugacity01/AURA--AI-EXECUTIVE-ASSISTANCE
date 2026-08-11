import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CampaignRecipientStatus } from "@prisma/client";
import { CampaignPersonalizationService } from "@/services/contacts/campaign-personalization.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { contactIds, useAi = true } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id, userId: session.user.id },
      include: { recipients: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Filter out contacts that are already in the campaign
    const existingContactIds = new Set(campaign.recipients.map((r: any) => r.contactId));
    const newContactIds = contactIds.filter(id => !existingContactIds.has(id));

    if (newContactIds.length === 0) {
      return NextResponse.json({ success: true, message: "All provided contacts are already in this campaign.", count: 0 });
    }

    // Create new recipients in PENDING state
    const recipientCreations = newContactIds.map(contactId => ({
      campaignId: id,
      contactId: contactId,
      approvalStatus: CampaignRecipientStatus.PENDING,
      sendStatus: CampaignRecipientStatus.PENDING
    }));

    await prisma.campaignRecipient.createMany({ data: recipientCreations });

    // Update campaign counts safely by counting actual rows to fix any desync
    const total = await prisma.campaignRecipient.count({ where: { campaignId: id } });
    const pending = await prisma.campaignRecipient.count({ where: { campaignId: id, approvalStatus: CampaignRecipientStatus.PENDING } });

    await prisma.campaign.update({
      where: { id },
      data: {
        totalRecipients: total,
        pendingRecipients: pending,
        // If the campaign was already finished, transition to GENERATING so the UI starts polling
        ...( (campaign.status === "COMPLETED" || campaign.status === "FAILED" || campaign.status === "READY") ? { status: "GENERATING" } : {} )
      }
    });

    // Trigger async AI generation just for the new pending recipients
    // `regenerate=false` ensures we don't mess with existing generated/sent ones
    CampaignPersonalizationService.generateAllForCampaign(id, session.user.id, useAi, false).catch(err => {
      console.error("Background AI generation failed for new recipients:", err);
    });

    return NextResponse.json({ 
      success: true, 
      message: `Added ${newContactIds.length} new recipients and started generation.`,
      count: newContactIds.length
    });
  } catch (error: any) {
    console.error("Failed to add recipients:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
