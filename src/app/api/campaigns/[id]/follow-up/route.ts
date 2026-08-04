import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { FollowUpService } from "@/services/campaigns/follow-up.service";
import { FollowUpType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const { followUpType, recipientFilter, additionalInstructions, customRecipientIds, masterSubject, masterBody } = body;

    if (!followUpType || !recipientFilter) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const campaign = await FollowUpService.create(
      id,
      session.user.id,
      followUpType as FollowUpType,
      recipientFilter,
      additionalInstructions || "",
      customRecipientIds || [],
      masterSubject,
      masterBody
    );

    return NextResponse.json({ success: true, campaignId: campaign.id });
  } catch (error: any) {
    console.error("Failed to create follow-up campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
