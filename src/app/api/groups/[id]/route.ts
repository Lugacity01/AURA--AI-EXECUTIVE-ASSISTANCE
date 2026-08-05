import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updatedGroup = await prisma.contactGroup.update({
      where: {
        id,
        userId: session.user.id
      },
      data: {
        name,
        description
      }
    });

    return NextResponse.json(updatedGroup);
  } catch (error: any) {
    console.error("Failed to update group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    // We don't delete the contacts, only the group and group memberships
    // Prisma cascading should handle deleting the ContactGroupMember records automatically 
    // when the ContactGroup is deleted if it's set up that way, otherwise we delete them manually.
    
    // First remove all memberships for this group
    await prisma.contactGroupMember.deleteMany({
      where: {
        groupId: id
      }
    });

    // Then delete the group
    await prisma.contactGroup.delete({
      where: {
        id,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
