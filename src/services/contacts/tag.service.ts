import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class TagService {
  static async getTags(userId: string) {
    return prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { contactTags: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async createTag(userId: string, data: Omit<Prisma.TagCreateInput, "userId" | "id">) {
    return prisma.tag.create({
      data: {
        ...data,
        userId
      }
    });
  }

  static async updateTag(tagId: string, userId: string, data: Prisma.TagUpdateInput) {
    return prisma.tag.update({
      where: { id: tagId, userId },
      data
    });
  }

  static async deleteTag(tagId: string, userId: string) {
    return prisma.tag.delete({
      where: { id: tagId, userId }
    });
  }

  static async addTagsToContacts(tagId: string, contactIds: string[], userId: string) {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId, userId }
    });
    if (!tag) throw new Error("Tag not found");

    const creations = contactIds.map(contactId => ({
      tagId,
      contactId
    }));

    return prisma.contactTag.createMany({
      data: creations
    });
  }

  static async removeTagsFromContacts(tagId: string, contactIds: string[], userId: string) {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId, userId }
    });
    if (!tag) throw new Error("Tag not found");

    return prisma.contactTag.deleteMany({
      where: {
        tagId,
        contactId: { in: contactIds }
      }
    });
  }
}
