import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all contacts that have 0 group memberships
    const ungroupedContacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id,
        groupMemberships: {
          none: {} // matches contacts with no groupMemberships
        }
      },
      select: { id: true }
    });

    const contactIds = ungroupedContacts.map(c => c.id);

    if (contactIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.contact.deleteMany({
      where: {
        id: { in: contactIds },
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true, count: contactIds.length });
  } catch (error: any) {
    console.error("Failed to delete ungrouped contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
