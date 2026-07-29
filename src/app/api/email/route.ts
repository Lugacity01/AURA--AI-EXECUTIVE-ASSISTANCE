import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { GmailService } from "../../../services/gmail.service";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || "mock-user-123";

    const emails = await GmailService.getEmails(userId);
    return NextResponse.json(emails);
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

    const { emailId, status } = body;
    if (!emailId || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const updated = await GmailService.updateEmailStatus(emailId, status);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
