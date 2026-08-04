import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CampaignPersonalizationService } from "@/services/contacts/campaign-personalization.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    // Check if the request has a body with useAi or regenerate flags
    let useAi = true;
    let regenerate = false;
    let eventDate: string | undefined;
    let eventDuration: number | undefined;
    try {
      const body = await request.json();
      if (body.useAi === false) useAi = false;
      if (body.regenerate === true) regenerate = true;
      if (body.eventDate) eventDate = body.eventDate;
      if (body.eventDuration) eventDuration = body.eventDuration;
    } catch (e) {
      // Body might be empty
    }
    
    // Save event details if provided
    if (eventDate || eventDuration) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.campaign.update({
        where: { id },
        data: {
          eventDate: eventDate ? new Date(eventDate) : undefined,
          eventDuration: eventDuration
        }
      });
    }
    
    // Fire off the generation asynchronously so we don't block the request if there are hundreds of recipients
    // In a production app, we would push this to a real message queue (like SQS or BullMQ)
    CampaignPersonalizationService.generateAllForCampaign(id, session.user.id, useAi, regenerate).catch(err => {
      console.error("Background AI generation failed:", err);
    });

    return NextResponse.json({ success: true, message: "Generation started in the background" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
