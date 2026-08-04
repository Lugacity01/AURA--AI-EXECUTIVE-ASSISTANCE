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
    
    // Check if campaign belongs to user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId: session.user.id }
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const { filename, mimeType, size, fileData } = body;

    if (!filename || !fileData) {
      return NextResponse.json({ error: "Missing filename or fileData" }, { status: 400 });
    }

    // Ensure the payload isn't overwhelmingly huge for MongoDB (e.g. >15MB)
    // base64 size is roughly 4/3 of original. 
    if (fileData.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (Max 10MB allowed)" }, { status: 413 });
    }

    const attachment = await prisma.campaignAttachment.create({
      data: {
        campaignId,
        originalFilename: filename,
        storageKey: `local_${Date.now()}_${filename}`, // Just a dummy key since we use fileData
        mimeType,
        size,
        fileData,
        uploadedBy: session.user.id
      }
    });

    return NextResponse.json({ success: true, attachment });
  } catch (error: any) {
    console.error("Attachment upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
