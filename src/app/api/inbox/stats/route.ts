import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { InboxService } from "@/services/inbox";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await InboxService.getStats(session.user.id);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("Inbox stats route error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve inbox stats" }, { status: 500 });
  }
}
