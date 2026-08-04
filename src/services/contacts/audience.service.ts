import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

interface RuleCondition {
  field: "organization" | "department" | "jobTitle" | "group" | "tag" | "city"; // Extensible
  operator: "equals" | "contains" | "not_equals";
  value: string;
}

interface AudienceRules {
  operator: "AND" | "OR";
  conditions: RuleCondition[];
}

export class AudienceService {
  /**
   * Evaluates dynamic rules against the database to find matching contacts
   */
  static async evaluateAudienceRules(userId: string, rulesJson: string) {
    const rules = JSON.parse(rulesJson) as AudienceRules;
    if (!rules.conditions || rules.conditions.length === 0) return [];

    let prismaWhere: Prisma.ContactWhereInput = { userId };
    
    // We dynamically build the Prisma where clause based on the rules.
    const conditions = rules.conditions.map(cond => {
      let clause: Prisma.ContactWhereInput = {};
      
      switch (cond.field) {
        case 'organization':
          clause = { organization: { name: cond.operator === 'contains' ? { contains: cond.value, mode: 'insensitive' } : cond.value } };
          break;
        case 'department':
          clause = { department: cond.operator === 'contains' ? { contains: cond.value, mode: 'insensitive' } : cond.value };
          break;
        case 'jobTitle':
          clause = { jobTitle: cond.operator === 'contains' ? { contains: cond.value, mode: 'insensitive' } : cond.value };
          break;
        case 'group':
          // Evaluates if contact belongs to a group with this name
          clause = { groupMemberships: { some: { group: { name: cond.value } } } };
          break;
        case 'tag':
          clause = { tags: { some: { tag: { name: cond.value } } } };
          break;
      }

      if (cond.operator === 'not_equals') {
        return { NOT: clause };
      }
      return clause;
    });

    if (rules.operator === 'AND') {
      prismaWhere.AND = conditions;
    } else {
      prismaWhere.OR = conditions;
    }

    return prisma.contact.findMany({
      where: prismaWhere,
      include: { organization: true, tags: { include: { tag: true } } }
    });
  }

  static async getAudiences(userId: string) {
    return prisma.audience.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createAudience(userId: string, data: Omit<Prisma.AudienceCreateInput, "userId" | "id">) {
    // Validate rules JSON format before saving
    try {
      const parsed = JSON.parse(data.rules) as AudienceRules;
      if (!parsed.operator || !Array.isArray(parsed.conditions)) throw new Error("Invalid format");
    } catch (e) {
      throw new Error("Invalid audience rules JSON.");
    }

    return prisma.audience.create({
      data: {
        ...data,
        userId
      }
    });
  }

  static async updateAudience(audienceId: string, userId: string, data: Prisma.AudienceUpdateInput) {
    return prisma.audience.update({
      where: { id: audienceId, userId },
      data
    });
  }

  static async deleteAudience(audienceId: string, userId: string) {
    return prisma.audience.delete({
      where: { id: audienceId, userId }
    });
  }
}
