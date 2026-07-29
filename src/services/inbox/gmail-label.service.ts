import { EmailStatus } from "@prisma/client";

export class GmailLabelService {
  /**
   * Helper to evaluate read/unread status from Gmail label lists.
   */
  static getStatusFromLabels(labelIds: string[]): EmailStatus {
    if (!labelIds || !Array.isArray(labelIds)) return "READ";
    
    if (labelIds.includes("UNREAD")) {
      return "UNREAD";
    }
    
    return "READ";
  }

  /**
   * Computes updated labelIds array given arrays of labels to add or remove.
   */
  static cleanLabels(labelIds: string[], toAdd: string[], toRemove: string[]): string[] {
    const updated = new Set(labelIds || []);
    toRemove.forEach(l => updated.delete(l));
    toAdd.forEach(l => updated.add(l));
    return Array.from(updated);
  }
}
