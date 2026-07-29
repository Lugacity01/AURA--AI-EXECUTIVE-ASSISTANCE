import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { GmailSyncService } from "@/services/gmail";
import { GmailService } from "@/services/gmail.service";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await GmailSyncService.syncInbox(session.user.id);
    
    if (summary.status === "FAILED") {
      return NextResponse.json(summary, { status: 500 });
    }
    if (summary.status === "IN_PROGRESS") {
      return NextResponse.json(summary, { status: 409 });
    }

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("API gmail/sync exception:", err);
    
    // Check if the connection status is still considered connected under the 7-day grace period rule
    const connStatus = await GmailService.getGmailConnectionStatus(session.user.id);
    if (connStatus.status === "CONNECTED") {
      return NextResponse.json({
        status: "SUCCESS",
        created: 0,
        updated: 0,
        warning: "Gmail sync is temporarily paused. Please reconnect your account to fetch new messages."
      });
    }

    const errMsg = err.message || "";
    if (errMsg.toLowerCase().includes("expired") || errMsg.toLowerCase().includes("token")) {
      return NextResponse.json(
        { error: "Gmail authentication expired. Please reconnect your account in Settings." },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: err.message || "Failed to execute sync" }, { status: 500 });
  }
}
