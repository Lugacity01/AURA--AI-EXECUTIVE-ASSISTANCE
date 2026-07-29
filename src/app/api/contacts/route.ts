import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { ContactService } from "../../../services/contact.service";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || "mock-user-123";

    const contacts = await ContactService.getContacts(userId);
    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactId, notes } = body;

    if (!contactId || notes === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const updated = await ContactService.updateContactNotes(contactId, notes);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
