import { prisma } from "../lib/prisma";

export class AutomationService {
  /**
   * Fetches automation preference rules.
   */
  static async getRules(userId: string) {
    return prisma.automationRule.findMany({
      where: { userId }
    });
  }

  /**
   * Toggles an automation rule's active state.
   */
  static async toggleRule(ruleId: string) {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) throw new Error("Automation rule not found");

    return prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        enabled: !rule.enabled
      }
    });
  }
}
