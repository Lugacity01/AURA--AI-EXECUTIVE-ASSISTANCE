import { prisma } from "../../lib/prisma";
import { TokenManager } from "../gmail/token-manager";
import { BulkActionResult } from "./inbox.types";

export class InboxActionsService {
  /**
   * Helper to perform modification calls to Google API.
   */
  static async modifyGmailMessage(
    accessToken: string,
    gmailId: string,
    body: { addLabelIds?: string[]; removeLabelIds?: string[] }
  ): Promise<void> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Gmail API modify returned status ${res.statusText}`);
    }
  }

  /**
   * Helper to trash Gmail message.
   */
  static async trashGmailMessage(accessToken: string, gmailId: string): Promise<void> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Gmail API trash returned status ${res.statusText}`);
    }
  }

  /**
   * Helper to untrash Gmail message.
   */
  static async untrashGmailMessage(accessToken: string, gmailId: string): Promise<void> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/untrash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Gmail API untrash returned status ${res.statusText}`);
    }
  }

  /**
   * Orchestrates bulk state mutations across Gmail REST APIs and local database entries.
   */
  static async executeBulkAction(
    userId: string,
    ids: string[],
    action: "MARK_READ" | "MARK_UNREAD" | "ARCHIVE" | "TRASH" | "RESTORE"
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      action,
      successful: [],
      failed: []
    };

    let accessToken: string;
    try {
      accessToken = await TokenManager.getValidAccessToken(userId);
    } catch (err: any) {
      ids.forEach(id => {
        result.failed.push({ id, reason: `Authentication failed: ${err.message}` });
      });
      return result;
    }

    for (const id of ids) {
      try {
        const email = await prisma.email.findFirst({
          where: { id, userId }
        });

        if (!email) {
          result.failed.push({ id, reason: "Message not found in database" });
          continue;
        }

        const gmailId = email.gmailId;
        const currentLabels = email.labelIds;

        if (action === "MARK_READ") {
          await this.modifyGmailMessage(accessToken, gmailId, { removeLabelIds: ["UNREAD"] });
          await prisma.email.update({
            where: { id },
            data: {
              status: "READ",
              labelIds: { set: currentLabels.filter(l => l !== "UNREAD") }
            }
          });
        } else if (action === "MARK_UNREAD") {
          await this.modifyGmailMessage(accessToken, gmailId, { addLabelIds: ["UNREAD"] });
          const newLabels = Array.from(new Set([...currentLabels, "UNREAD"]));
          await prisma.email.update({
            where: { id },
            data: {
              status: "UNREAD",
              labelIds: { set: newLabels }
            }
          });
        } else if (action === "ARCHIVE") {
          await this.modifyGmailMessage(accessToken, gmailId, { removeLabelIds: ["INBOX"] });
          await prisma.email.update({
            where: { id },
            data: {
              labelIds: { set: currentLabels.filter(l => l !== "INBOX") }
            }
          });
        } else if (action === "TRASH") {
          await this.trashGmailMessage(accessToken, gmailId);
          const newLabels = Array.from(new Set([...currentLabels.filter(l => l !== "INBOX"), "TRASH"]));
          await prisma.email.update({
            where: { id },
            data: {
              labelIds: { set: newLabels }
            }
          });
        } else if (action === "RESTORE") {
          await this.untrashGmailMessage(accessToken, gmailId);
          const newLabels = Array.from(new Set([...currentLabels.filter(l => l !== "TRASH"), "INBOX"]));
          await prisma.email.update({
            where: { id },
            data: {
              labelIds: { set: newLabels }
            }
          });
        }

        result.successful.push(id);
      } catch (err: any) {
        console.error(`Bulk action failed for email ID ${id}:`, err);
        result.failed.push({ id, reason: err.message || "Execution exception occurred" });
      }
    }

    return result;
  }
}
