import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class ContactService {
  /**
   * Retrieves paginated contacts with advanced search and filtering
   */
  static async getContacts(userId: string, options?: {
    search?: string;
    organizationId?: string;
    groupId?: string;
    tagId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 20);
    
    let whereClause: Prisma.ContactWhereInput = { userId };

    if (options?.search) {
      whereClause.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
        { company: { contains: options.search, mode: "insensitive" } },
        { jobTitle: { contains: options.search, mode: "insensitive" } }
      ];
    }

    if (options?.organizationId) {
      whereClause.organizationId = options.organizationId;
    }

    if (options?.groupId) {
      whereClause.groupMemberships = { some: { groupId: options.groupId } };
    }

    if (options?.tagId) {
      whereClause.tags = { some: { tagId: options.tagId } };
    }

    const [total, contacts] = await prisma.$transaction([
      prisma.contact.count({ where: whereClause }),
      prisma.contact.findMany({
        where: whereClause,
        include: {
          organization: true,
          tags: { include: { tag: true } },
          groupMemberships: { include: { group: true } }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastInteraction: 'desc' }
      })
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), contacts };
  }

  /**
   * Create a single contact with duplicate detection and optional group assignments
   */
  static async createContact(userId: string, data: Omit<Prisma.ContactCreateInput, "userId" | "id"> & { groupIds?: string[] }) {
    const { groupIds, ...contactData } = data;
    // Basic deduplication
    const existing = await prisma.contact.findFirst({
      where: { email: data.email, userId }
    });

    if (existing) {
      throw new Error(`Contact with email ${data.email} already exists in the database.`);
    }

    try {
      return await prisma.contact.create({
        data: {
          ...contactData,
          userId,
          groupMemberships: groupIds && groupIds.length > 0 ? {
            create: groupIds.map(groupId => ({ groupId }))
          } : undefined
        },
        include: { organization: true, tags: true, groupMemberships: { include: { group: true } } }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(`A contact with this email already exists.`);
      }
      throw error;
    }
  }

  /**
   * Update contact
   */
  static async updateContact(contactId: string, userId: string, data: Prisma.ContactUpdateInput) {
    return prisma.contact.update({
      where: { id: contactId, userId },
      data,
      include: { organization: true, tags: true }
    });
  }

  /**
   * Delete contact
   */
  static async deleteContact(contactId: string, userId: string) {
    return prisma.contact.delete({
      where: { id: contactId, userId }
    });
  }

  /**
   * Extensible import stub (CSV, Excel, etc.)
   */
  static async importContacts(userId: string, provider: 'CSV' | 'EXCEL' | 'GOOGLE' | 'OUTLOOK', rawData: any[]) {
    // Implementation for parsing, normalizing, and bulk uploading contacts
    // while checking for duplicates against Name+Org or Email.
    return { imported: 0, duplicates: 0, errors: [] };
  }
}
