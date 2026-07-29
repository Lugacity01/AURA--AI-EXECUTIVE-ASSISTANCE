import { EmailStatus } from "@prisma/client";

export enum InboxFilter {
  INBOX = "INBOX",
  ALL_MAIL = "ALL_MAIL",
  UNREAD = "UNREAD",
  READ = "READ",
  STARRED = "STARRED",
  SENT = "SENT",
  ARCHIVED = "ARCHIVED",
  TRASH = "TRASH",
  SPAM = "SPAM",
  ATTACHMENTS = "ATTACHMENTS"
}

export interface InboxItemDTO {
  id: string;
  threadId: string;
  gmailId: string;
  from: string;
  fromName: string | null;
  to: string;
  subject: string;
  body: string;
  snippet: string | null;
  receivedAt: Date;
  status: EmailStatus;
  hasAttachments: boolean;
  labelIds: string[];
  messageCount: number;
}

export interface EmailDetailDTO {
  id: string;
  threadId: string;
  gmailId: string;
  from: string;
  fromName: string | null;
  to: string;
  subject: string;
  body: string;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date;
  status: EmailStatus;
  hasAttachments: boolean;
  labelIds: string[];
}

export interface ThreadResponse {
  threadId: string;
  subject: string;
  sender: string;
  recipients: string[];
  participants: string[];
  messageCount: number;
  messages: EmailDetailDTO[];
}

export interface BulkActionResult {
  action: "MARK_READ" | "MARK_UNREAD" | "ARCHIVE" | "TRASH" | "RESTORE";
  successful: string[];
  failed: { id: string; reason: string }[];
}
