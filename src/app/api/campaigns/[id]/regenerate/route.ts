import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CampaignPersonalizationService } from "@/services/contacts/campaign-personalization.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const {
      description,
      pdfTemplate,
      pdfTitle,
      pdfEnabled,
      pdfFilename,
      pdfHeaderImage,
      pdfBackgroundFit,
      pdfContentX,
      pdfContentY,
      pdfContentWidth,
      pdfContentHeight,
      pdfFontSize,
      pdfLineHeight,
      pdfAlignment,
      useAi = true
    } = body;

    if (!description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Update the master draft/description & PDF fields
    const updateData: any = { description: description };
    if (pdfTemplate !== undefined) updateData.pdfTemplate = pdfTemplate;
    if (pdfTitle !== undefined) updateData.pdfTitle = pdfTitle;
    if (pdfEnabled !== undefined) updateData.pdfEnabled = pdfEnabled;
    if (pdfFilename !== undefined) updateData.pdfFilename = pdfFilename;
    if (pdfHeaderImage !== undefined) updateData.pdfHeaderImage = pdfHeaderImage;
    if (pdfBackgroundFit !== undefined) updateData.pdfBackgroundFit = pdfBackgroundFit;
    if (pdfContentX !== undefined) updateData.pdfContentX = pdfContentX;
    if (pdfContentY !== undefined) updateData.pdfContentY = pdfContentY;
    if (pdfContentWidth !== undefined) updateData.pdfContentWidth = pdfContentWidth;
    if (pdfContentHeight !== undefined) updateData.pdfContentHeight = pdfContentHeight;
    if (pdfFontSize !== undefined) updateData.pdfFontSize = pdfFontSize;
    if (pdfLineHeight !== undefined) updateData.pdfLineHeight = pdfLineHeight;
    if (pdfAlignment !== undefined) updateData.pdfAlignment = pdfAlignment;

    await prisma.campaign.update({
      where: { id },
      data: updateData
    });

    if (campaign.templateId) {
      await prisma.template.update({
        where: { id: campaign.templateId },
        data: { basePrompt: description }
      });
    }

    // Trigger async AI generation and force reset of GENERATED/FAILED recipients
    // Regenerate = true (4th argument)
    CampaignPersonalizationService.generateAllForCampaign(id, session.user.id, useAi, true).catch(err => {
      console.error("Background AI regeneration failed:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Campaign draft updated and regeneration started."
    });
  } catch (error: any) {
    console.error("Failed to regenerate campaign:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
