import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: campaignId } = await params;
    const { basePrompt, pdfEnabled, pdfFilename, pdfContentSource, pdfTitle, pdfTemplate } = await request.json();

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const isPdfEnabled = Boolean(pdfEnabled || pdfTemplate || pdfTitle);

    // Update campaign PDF settings
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        pdfEnabled: isPdfEnabled,
        pdfFilename: pdfFilename || "Official_Notice.pdf",
        pdfContentSource: pdfContentSource || "EMAIL_BODY",
        pdfTitle: pdfTitle || null,
        pdfTemplate: pdfTemplate || null,
      }
    });

    if (campaign.templateId) {
      await prisma.template.update({
        where: { id: campaign.templateId },
        data: { basePrompt }
      });
    } else {
      const template = await prisma.template.create({
        data: {
          userId: session.user.id,
          name: `${campaign.title} Template`,
          basePrompt,
        }
      });
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { templateId: template.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
