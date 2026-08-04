import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class OrganizationService {
  /**
   * Get paginated organizations
   */
  static async getOrganizations(userId: string, options?: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    
    let whereClause: Prisma.OrganizationWhereInput = { userId };

    if (options?.search) {
      whereClause.name = { contains: options.search, mode: "insensitive" };
    }

    const [total, organizations] = await prisma.$transaction([
      prisma.organization.count({ where: whereClause }),
      prisma.organization.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { contacts: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), organizations };
  }

  /**
   * Create an organization
   */
  static async createOrganization(userId: string, data: Omit<Prisma.OrganizationCreateInput, "userId" | "id">) {
    return prisma.organization.create({
      data: {
        ...data,
        userId
      }
    });
  }

  /**
   * Get organization by ID with its contacts
   */
  static async getOrganizationById(orgId: string, userId: string) {
    return prisma.organization.findUnique({
      where: { id: orgId, userId },
      include: {
        contacts: {
          orderBy: { name: 'asc' }
        }
      }
    });
  }

  /**
   * Update organization
   */
  static async updateOrganization(orgId: string, userId: string, data: Prisma.OrganizationUpdateInput) {
    return prisma.organization.update({
      where: { id: orgId, userId },
      data
    });
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(orgId: string, userId: string) {
    return prisma.organization.delete({
      where: { id: orgId, userId }
    });
  }
}
