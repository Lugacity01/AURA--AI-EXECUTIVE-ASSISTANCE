import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { ContactService } from "../../../services/contacts/contact.service";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const organizationId = searchParams.get("organizationId") || undefined;
    const groupId = searchParams.get("groupId") || undefined;
    const tagId = searchParams.get("tagId") || undefined;

    const result = await ContactService.getContacts(session.user.id, {
      page, limit, search, organizationId, groupId, tagId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupIds, ...data } = await request.json();
    const contact = await ContactService.createContact(session.user.id, { ...data, groupIds });

    return NextResponse.json(contact);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
