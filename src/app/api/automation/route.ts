import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { AutomationService } from "../../../services/automation.service";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    const userId = session?.user?.id || "mock-user-123";

    const rules = await AutomationService.getRules(userId);
    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ruleId } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "Missing ruleId parameter" }, { status: 400 });
    }

    const updated = await AutomationService.toggleRule(ruleId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
