import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = await prisma.email.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { draft: true }
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const detailDTO = {
      id: email.id,
      threadId: email.threadId,
      gmailId: email.gmailId,
      from: email.from,
      fromName: email.fromName,
      to: email.to,
      subject: email.subject,
      snippet: email.snippet,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      receivedAt: email.receivedAt,
      status: email.status,
      hasAttachments: email.hasAttachments,
      labelIds: email.labelIds
    };

    return NextResponse.json(detailDTO);
  } catch (err: any) {
    console.error(`Error loading email ${params.id}:`, err);
    return NextResponse.json({ error: err.message || "Failed to retrieve email details" }, { status: 500 });
  }
}
