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
    const { contactIds = [], groupIds = [], organizationIds = [] } = await request.json();

    if (!Array.isArray(contactIds) || !Array.isArray(groupIds) || !Array.isArray(organizationIds)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    if (contactIds.length === 0 && groupIds.length === 0 && organizationIds.length === 0) {
      return NextResponse.json({ error: "No recipients selected" }, { status: 400 });
    }

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Resolve all contact IDs
    const finalContactIds = new Set<string>(contactIds);

    // Expand groups
    if (groupIds.length > 0) {
      const groupMembers = await prisma.contactGroupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { contactId: true }
      });
      groupMembers.forEach(m => finalContactIds.add(m.contactId));
    }

    // Expand organizations
    if (organizationIds.length > 0) {
      const orgContacts = await prisma.contact.findMany({
        where: { organizationId: { in: organizationIds } },
        select: { id: true }
      });
      orgContacts.forEach(c => finalContactIds.add(c.id));
    }

    const uniqueContactIds = Array.from(finalContactIds);

    if (uniqueContactIds.length === 0) {
      return NextResponse.json({ error: "Selected groups/organizations have no contacts" }, { status: 400 });
    }

    // Create CampaignRecipient records
    // Use createMany to insert them all efficiently, but avoid duplicates if they already exist
    const existingRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, contactId: { in: uniqueContactIds } },
      select: { contactId: true }
    });

    const existingContactIds = existingRecipients.map(r => r.contactId);
    const newContactIds = uniqueContactIds.filter(id => !existingContactIds.includes(id));

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
