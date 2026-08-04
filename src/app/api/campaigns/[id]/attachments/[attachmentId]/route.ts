import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: campaignId, attachmentId } = await params;
    
    // Check if campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete attachment
    await prisma.campaignAttachment.delete({
      where: { id: attachmentId, campaignId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Attachment deletion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  // Not strictly needed if we just return the list on the campaign fetch, but useful for downloading.
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
