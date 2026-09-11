import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { DraftService } from "../../../services/draft.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || "mock-user-123";

    const drafts = await DraftService.getDrafts(userId);
    return NextResponse.json(drafts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { draftId, draftContent } = body;

    if (!draftId || draftContent === undefined) {
      return NextResponse.json({ error: "Missing draft ID or content" }, { status: 400 });
    }

    const updated = await DraftService.updateDraft(draftId, draftContent);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || "mock-user-123";
    const body = await request.json();
    const { draftId, emailId, action } = body; // action: "approve" | "archive" | "generate" | "restore"

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    if (action === "generate") {
      if (!emailId) {
        return NextResponse.json({ error: "Missing emailId parameter" }, { status: 400 });
      }
      const result = await DraftService.generateDraftForEmail(emailId, userId, body.customInstructions);
      return NextResponse.json(result);
    }

    let targetDraftId = draftId;
    if (!targetDraftId && emailId) {
      const existingDraft = await prisma.emailDraft.findUnique({ where: { emailId } });
      if (existingDraft) {
        targetDraftId = existingDraft.id;
      } else if (action === "approve") {
        const newDraft = await DraftService.generateDraftForEmail(emailId, userId);
        targetDraftId = newDraft.id;
      } else if (action === "archive") {
        await prisma.email.update({
          where: { id: emailId },
          data: { status: "IGNORED" }
        });
        return NextResponse.json({ success: true, message: "Email archived." });
      }
    }

    if (!targetDraftId) {
      return NextResponse.json({ error: "Missing draftId or emailId parameter" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await DraftService.approveDraft(targetDraftId);
      return NextResponse.json(result);
    } else if (action === "archive") {
      const result = await DraftService.archiveDraft(targetDraftId);
      return NextResponse.json(result);
    } else if (action === "restore") {
      const result = await DraftService.restoreDraft(targetDraftId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API Drafts POST Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
