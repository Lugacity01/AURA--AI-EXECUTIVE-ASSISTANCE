import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contacts, groupId } = await request.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Invalid or empty contacts array" }, { status: 400 });
    }

    // Process contacts (deduplicate and upsert)
    let imported = 0;
    
    // We process sequentially or in batches because Prisma doesn't natively support upsertMany
    for (const contactData of contacts) {
      if (!contactData.name || !contactData.email) continue;
      
      const email = contactData.email.trim().toLowerCase();
      
      const contact = await prisma.contact.upsert({
        where: {
          email: email
        },
        update: {
          name: contactData.name.trim(),
          company: contactData.company?.trim(),
          jobTitle: contactData.jobTitle?.trim(),
        },
        create: {
          userId: session.user.id,
          name: contactData.name.trim(),
          email: email,
          company: contactData.company?.trim(),
          jobTitle: contactData.jobTitle?.trim(),
        }
      });

      // If groupId is provided, ensure the contact is in that group
      if (groupId) {
        await prisma.contactGroupMember.upsert({
          where: {
            groupId_contactId: {
              groupId,
              contactId: contact.id
            }
          },
          update: {},
          create: {
            groupId,
            contactId: contact.id
          }
        });
      }

      imported++;
    }

    return NextResponse.json({ success: true, count: imported });
  } catch (error: any) {
    console.error("Failed to bulk import contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactIds } = await request.json();

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty contactIds array" }, { status: 400 });
    }

    // Clean up group memberships first (Cascade should handle this but manual cleanup is safe)
    await prisma.contactGroupMember.deleteMany({
      where: {
        contactId: { in: contactIds }
      }
    });

    const result = await prisma.contact.deleteMany({
      where: {
        id: { in: contactIds },
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Failed to bulk delete contacts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
