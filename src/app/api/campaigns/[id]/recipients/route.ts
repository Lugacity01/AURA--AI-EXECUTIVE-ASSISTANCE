import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: campaignId } = await params;
    const { contactIds } = await request.json();

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Invalid contact IDs" }, { status: 400 });
    }

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Create CampaignRecipient records
    // Use createMany to insert them all efficiently, but avoid duplicates if they already exist
    const existingRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, contactId: { in: contactIds } },
      select: { contactId: true }
    });

    const existingContactIds = existingRecipients.map(r => r.contactId);
    const newContactIds = contactIds.filter(id => !existingContactIds.includes(id));

    if (newContactIds.length > 0) {
      await prisma.campaignRecipient.createMany({
        data: newContactIds.map(contactId => ({
          campaignId,
          contactId,
        }))
      });
    }

    return NextResponse.json({ success: true, added: newContactIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
