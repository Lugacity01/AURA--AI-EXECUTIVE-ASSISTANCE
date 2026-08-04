import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class GroupService {
  static async getGroups(userId: string) {
    return prisma.contactGroup.findMany({
      where: { userId },
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async createGroup(userId: string, data: Omit<Prisma.ContactGroupCreateInput, "userId" | "id">) {
    return prisma.contactGroup.create({
      data: {
        ...data,
        userId
      }
    });
  }

  static async updateGroup(groupId: string, userId: string, data: Prisma.ContactGroupUpdateInput) {
    return prisma.contactGroup.update({
      where: { id: groupId, userId },
      data
    });
  }

  static async deleteGroup(groupId: string, userId: string) {
    return prisma.contactGroup.delete({
      where: { id: groupId, userId }
    });
  }

  static async addMembers(groupId: string, contactIds: string[], userId: string) {
    // Verify group belongs to user
    const group = await prisma.contactGroup.findUnique({
      where: { id: groupId, userId }
    });
    if (!group) throw new Error("Group not found");

    const creations = contactIds.map(contactId => ({
      groupId,
      contactId
    }));

    // createMany skipDuplicates is highly optimized
    return prisma.contactGroupMember.createMany({
      data: creations
    });
  }

  static async removeMembers(groupId: string, contactIds: string[], userId: string) {
    const group = await prisma.contactGroup.findUnique({
      where: { id: groupId, userId }
    });
    if (!group) throw new Error("Group not found");

    return prisma.contactGroupMember.deleteMany({
      where: {
        groupId,
        contactId: { in: contactIds }
      }
    });
  }
}
