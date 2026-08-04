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

    const data = await request.json();
    const campaign = await CampaignService.createCampaign(session.user.id, data);

    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
