import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const followUps = await prisma.campaign.findMany({
      where: { parentCampaignId: id, userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        followUpType: true,
        status: true,
        createdAt: true,
        totalRecipients: true,
      }
    });

    return NextResponse.json(followUps);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
