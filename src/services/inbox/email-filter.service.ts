import { Prisma } from "@prisma/client";
import { InboxFilter } from "./inbox.types";

export class EmailFilterService {
  /**
   * Translates typed InboxFilters to Prisma Where inputs, safeguarding Trash/Spam states.
   */
  static buildFilterQuery(filter: InboxFilter): Prisma.EmailWhereInput {
    const isTrashQuery = filter === InboxFilter.TRASH;
    const isSpamQuery = filter === InboxFilter.SPAM;

    const baseRestrictions: Prisma.EmailWhereInput[] = [];
    if (!isTrashQuery) {
      baseRestrictions.push({ NOT: { labelIds: { has: "TRASH" } } });
    }
    if (!isSpamQuery) {
      baseRestrictions.push({ NOT: { labelIds: { has: "SPAM" } } });
    }

    let filterQuery: Prisma.EmailWhereInput = {};

    switch (filter) {
      case InboxFilter.INBOX:
        filterQuery = { labelIds: { has: "INBOX" } };
        break;
      case InboxFilter.UNREAD:
        filterQuery = { status: "UNREAD" };
        break;
      case InboxFilter.READ:
        filterQuery = { status: "READ" };
        break;
      case InboxFilter.STARRED:
        filterQuery = { labelIds: { has: "STARRED" } };
        break;
      case InboxFilter.ATTACHMENTS:
        filterQuery = { hasAttachments: true };
        break;
      case InboxFilter.SENT:
        filterQuery = { labelIds: { has: "SENT" } };
        break;
      case InboxFilter.ARCHIVED:
        filterQuery = { NOT: { labelIds: { has: "INBOX" } } };
        break;
      case InboxFilter.TRASH:
        filterQuery = { labelIds: { has: "TRASH" } };
        break;
      case InboxFilter.SPAM:
        filterQuery = { labelIds: { has: "SPAM" } };
        break;
      case InboxFilter.ALL_MAIL:
      default:
        filterQuery = {};
        break;
    }

    return {
      AND: [filterQuery, ...baseRestrictions]
    };
  }
}
