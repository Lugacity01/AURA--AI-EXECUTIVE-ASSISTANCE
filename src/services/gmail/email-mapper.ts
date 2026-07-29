import { MimeParser } from "./mime-parser";
import { EmailStatus } from "@prisma/client";

export class EmailMapper {
  /**
   * Helper to parse "Sender Name <email@domain.com>" or "email@domain.com"
   */
  static parseFromHeader(fromHeader: string): { name: string; email: string } {
    if (!fromHeader) {
      return { name: "Unknown Sender", email: "unknown@sender.com" };
    }
    const match = fromHeader.match(/^(.*?)\s*<([^>]+)>/);
    if (match) {
      return {
        name: match[1].replace(/['"]/g, "").trim() || match[2].trim(),
        email: match[2].trim()
      };
    }
    return { name: fromHeader.trim(), email: fromHeader.trim() };
  }

  /**
   * Maps a raw Gmail message JSON payload into a structured input ready for database upsert.
   */
  static mapGmailMessageToPrismaInput(userId: string, gmailMessage: any) {
    const { id, threadId, labelIds, snippet, historyId, internalDate, payload } = gmailMessage;
    
    const headers = payload?.headers || [];
    const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
    const to = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "";
    const dateStr = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
    
    const fromInfo = this.parseFromHeader(fromHeader);
    const parsedBodies = MimeParser.parsePayload(payload);
    
    const receivedAt = dateStr ? new Date(dateStr) : new Date();
    
    // Derive read/unread status from Gmail labels
    const isUnread = labelIds && Array.isArray(labelIds) && labelIds.includes("UNREAD");
    const status: EmailStatus = isUnread ? "UNREAD" : "READ";

    return {
      userId,
      gmailId: id,
      threadId,
      historyId: historyId || null,
      labelIds: labelIds || [],
      snippet: snippet || null,
      internalDate: internalDate ? new Date(parseInt(internalDate)) : null,
      hasAttachments: parsedBodies.hasAttachments,
      from: fromInfo.email,
      fromName: fromInfo.name,
      to,
      subject,
      body: parsedBodies.bodyText || snippet || "No readable content.",
      bodyText: parsedBodies.bodyText || null,
      bodyHtml: parsedBodies.bodyHtml || null,
      status,
      receivedAt
    };
  }
}
