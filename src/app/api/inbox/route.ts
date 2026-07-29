import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { InboxService, InboxFilter } from "@/services/inbox";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr) : 20;
  const search = searchParams.get("search") || "";
  const filterStr = searchParams.get("filter");
  const sortStr = searchParams.get("sort");

  // Validate filter input against InboxFilter enum
  let filter: InboxFilter = InboxFilter.INBOX;
  if (filterStr && Object.values(InboxFilter).includes(filterStr as InboxFilter)) {
    filter = filterStr as InboxFilter;
  }

  // Validate sort input
  let sort: "NEWEST" | "OLDEST" | "SENDER" | "SUBJECT" = "NEWEST";
  if (sortStr && ["NEWEST", "OLDEST", "SENDER", "SUBJECT"].includes(sortStr)) {
    sort = sortStr as any;
  }

  try {
    const result = await InboxService.getInbox(session.user.id, {
      cursor,
      limit,
      filter,
      search,
      sort
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Inbox route error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve inbox" }, { status: 500 });
  }
}
