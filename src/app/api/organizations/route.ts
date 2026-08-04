import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { headers } from "next/headers";
import { OrganizationService } from "../../../services/contacts/organization.service";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await OrganizationService.getOrganizations(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    const org = await OrganizationService.createOrganization(session.user.id, data);
    return NextResponse.json(org);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
