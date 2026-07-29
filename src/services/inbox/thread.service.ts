import { prisma } from "../../lib/prisma";
import { ThreadResponse, EmailDetailDTO } from "./inbox.types";

export class ThreadService {
  /**
   * Fetches conversation logs sharing the threadId and returns a structured DTO.
   */
  static async getThread(userId: string, threadId: string): Promise<ThreadResponse | null> {
    const messages = await prisma.email.findMany({
      where: { userId, threadId },
      orderBy: { receivedAt: "asc" }
    });

    if (messages.length === 0) {
      return null;
    }

    const firstMsg = messages[0];
    const subject = firstMsg.subject || "No Subject";
    const sender = firstMsg.from;

    const uniqueRecipients = new Set<string>();
    const uniqueParticipants = new Set<string>();

    messages.forEach(msg => {
      uniqueParticipants.add(msg.from);
      if (msg.to) {
        msg.to.split(",").forEach(r => {
          const trimmed = r.trim();
          if (trimmed) {
            uniqueRecipients.add(trimmed);
            uniqueParticipants.add(trimmed);
          }
        });
      }
    });

    const messagesDTO: EmailDetailDTO[] = messages.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      gmailId: msg.gmailId,
      from: msg.from,
      fromName: msg.fromName,
      to: msg.to,
      subject: msg.subject,
      body: msg.body,
      snippet: msg.snippet,
      bodyText: msg.bodyText,
      bodyHtml: msg.bodyHtml,
      receivedAt: msg.receivedAt,
      status: msg.status,
      hasAttachments: msg.hasAttachments,
      labelIds: msg.labelIds
    }));

    return {
      threadId,
      subject,
      sender,
      recipients: Array.from(uniqueRecipients),
      participants: Array.from(uniqueParticipants),
      messageCount: messages.length,
      messages: messagesDTO
    };
  }
}
