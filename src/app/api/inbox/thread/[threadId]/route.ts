import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ThreadService } from "@/services/inbox";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ threadId: string }> }
) {
  const params = await props.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thread = await ThreadService.getThread(session.user.id, params.threadId);
    
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (err: any) {
    console.error(`Thread load error for ${params.threadId}:`, err);
    return NextResponse.json({ error: err.message || "Failed to retrieve thread" }, { status: 500 });
  }
}
