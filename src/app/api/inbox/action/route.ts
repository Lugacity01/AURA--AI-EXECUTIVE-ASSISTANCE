import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { InboxActionsService } from "@/services/inbox";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ids } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid action or ids parameters" }, { status: 400 });
    }

    const validActions = ["MARK_READ", "MARK_UNREAD", "ARCHIVE", "TRASH", "RESTORE"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }

    const result = await InboxActionsService.executeBulkAction(session.user.id, ids, action);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Bulk action endpoint exception:", err);
    return NextResponse.json({ error: err.message || "Failed to execute bulk action" }, { status: 500 });
  }
}
