import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Contact relation deletes (like group memberships) are handled by Prisma CASCADE 
    // assuming schema is set up. Let's manually clean up group memberships just in case.after the approval status, why send status are so slow to be sent, where it was very fast before
    await prisma.contactGroupMember.deleteMany({
      where: { contactId: id }
    });

    await prisma.contact.delete({
      where: {
        id,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Extract groupIds if they are being updated
    const { groupIds, ...contactData } = body;

    const contact = await prisma.contact.update({
      where: {
        id,
        userId: session.user.id
      },
      data: contactData
    });

    // If groupIds are provided, update the group memberships
    if (groupIds && Array.isArray(groupIds)) {
      // First delete existing memberships
      await prisma.contactGroupMember.deleteMany({
        where: { contactId: id }
      });
      
      // Then create new ones
      if (groupIds.length > 0) {
        await prisma.contactGroupMember.createMany({
          data: groupIds.map((groupId: string) => ({
            contactId: id,
            groupId
          }))
        });
      }
    }

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error("Failed to update contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
