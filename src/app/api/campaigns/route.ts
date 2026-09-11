import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CampaignService } from "@/services/contacts/campaign.service";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const campaigns = await CampaignService.getCampaigns(session.user.id);
    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, campaignType, channel, contentLength } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Campaign title is required" }, { status: 400 });
    }

    const validTypes = ["MEETING", "NEWSLETTER", "FOLLOW_UP", "REMINDER", "ANNOUNCEMENT", "OUTREACH", "RECRUITMENT", "CUSTOM"];
    const validChannels = ["EMAIL", "WHATSAPP"];
    const validLengths = ["SHORT", "MEDIUM", "LONG"];

    const finalType = validTypes.includes(campaignType) ? campaignType : "NEWSLETTER";
    const finalChannel = validChannels.includes(channel) ? channel : "EMAIL";
    const finalLength = validLengths.includes(contentLength) ? contentLength : "MEDIUM";

    const campaign = await CampaignService.createCampaign(session.user.id, {
      title: title.trim(),
      description: description || "New AI Campaign",
      campaignType: finalType as any,
      channel: finalChannel as any,
      contentLength: finalLength
    });

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json({ error: error.message || "Failed to create campaign" }, { status: 400 });
  }
}
