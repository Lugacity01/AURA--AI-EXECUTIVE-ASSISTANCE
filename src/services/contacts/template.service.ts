import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export class TemplateService {
  static async getTemplates(userId: string) {
    return prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createTemplate(userId: string, data: Omit<Prisma.TemplateCreateInput, "userId" | "id">) {
    return prisma.template.create({
      data: {
        ...data,
        userId
      }
    });
  }

  static async updateTemplate(templateId: string, userId: string, data: Prisma.TemplateUpdateInput) {
    return prisma.template.update({
      where: { id: templateId, userId },
      data
    });
  }

  static async deleteTemplate(templateId: string, userId: string) {
    return prisma.template.delete({
      where: { id: templateId, userId }
    });
  }
}
