import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: campaignId, recipientId } = await params;
    const data = await request.json();

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update the recipient record
    const updatedRecipient = await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        personalizedSubject: data.personalizedSubject,
        personalizedBody: data.personalizedBody,
        approvalStatus: data.approvalStatus,
      },
    });

    return NextResponse.json(updatedRecipient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: campaignId, recipientId } = await params;

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete the recipient record
    await prisma.campaignRecipient.delete({
      where: { id: recipientId },
    });

    // Sync counts
    const total = await prisma.campaignRecipient.count({ where: { campaignId } });
    const pending = await prisma.campaignRecipient.count({ where: { campaignId, approvalStatus: "PENDING" } });

    // Determine if we need to unstuck the campaign status
    let newStatus = campaign.status;
    if (campaign.status === "GENERATING") {
      if (total === 0) {
        newStatus = "DRAFT";
      } else if (pending === 0) {
        newStatus = "READY";
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalRecipients: total,
        pendingRecipients: pending,
        status: newStatus
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
