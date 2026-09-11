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
    const {
      basePrompt,
      pdfEnabled,
      pdfFilename,
      pdfContentSource,
      pdfTitle,
      pdfTemplate,
      pdfHeaderImage,
      pdfBackgroundFit,
      pdfContentX,
      pdfContentY,
      pdfContentWidth,
      pdfContentHeight,
      pdfFontSize,
      pdfLineHeight,
      pdfAlignment,
      contentLength
    } = await request.json();

    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const isPdfEnabled = Boolean(pdfEnabled);

    // Validate background fit
    const validFit = ["A4", "HEADER"].includes(pdfBackgroundFit) ? pdfBackgroundFit : "A4";

    // Validate alignment
    const validAlign = ["LEFT", "CENTER", "RIGHT", "JUSTIFY"].includes(pdfAlignment) ? pdfAlignment : "LEFT";

    const promptText = basePrompt !== undefined ? basePrompt : (campaign.description || "");

    // Update campaign PDF settings, description, template, and contentLength atomically
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        description: promptText,
        contentLength: contentLength || campaign.contentLength || "MEDIUM",
        pdfEnabled: isPdfEnabled,
        pdfFilename: pdfFilename || "Attachment_Document.pdf",
        pdfContentSource: pdfContentSource || "EMAIL_BODY",
        pdfTitle: pdfTitle ? String(pdfTitle) : undefined,
        pdfTemplate: pdfTemplate ? String(pdfTemplate) : (promptText || undefined),
        pdfHeaderImage: pdfHeaderImage !== undefined ? pdfHeaderImage : campaign.pdfHeaderImage,
        pdfBackgroundFit: validFit,
        pdfContentX: typeof pdfContentX === "number" ? Math.max(0, Math.min(500, pdfContentX)) : 70,
        pdfContentY: typeof pdfContentY === "number" ? Math.max(0, Math.min(750, pdfContentY)) : 180,
        pdfContentWidth: typeof pdfContentWidth === "number" ? Math.max(100, Math.min(550, pdfContentWidth)) : 455,
        pdfContentHeight: typeof pdfContentHeight === "number" ? Math.max(100, Math.min(750, pdfContentHeight)) : 550,
        pdfFontSize: typeof pdfFontSize === "number" ? Math.max(9, Math.min(18, pdfFontSize)) : 11,
        pdfLineHeight: typeof pdfLineHeight === "number" ? Math.max(1.0, Math.min(2.0, pdfLineHeight)) : 1.4,
        pdfAlignment: validAlign,
        template: campaign.templateId
          ? { update: { basePrompt: promptText } }
          : { create: { userId: session.user.id, name: `${campaign.title} Template`, basePrompt: promptText } }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update campaign template settings:", error);
    return NextResponse.json({ error: error.message || "Failed to update campaign template" }, { status: 500 });
  }
}
