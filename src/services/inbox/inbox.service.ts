import { prisma } from "../../lib/prisma";
import { InboxFilter, InboxItemDTO } from "./inbox.types";
import { EmailFilterService } from "./email-filter.service";
import { EmailSearchService } from "./email-search.service";
import { SearchRankerService } from "./search-ranker.service";

export class InboxService {
  /**
   * Fetches the inbox list based on pagination, filters, and searches.
   * Maps matching emails to lightweight DTOs with page-optimized thread counts.
   */
  static async getInbox(
    userId: string,
    options: {
      cursor?: string;
      limit?: number;
      filter?: InboxFilter;
      search?: string;
      sort?: "NEWEST" | "OLDEST" | "SENDER" | "SUBJECT";
    } = {}
  ): Promise<{ items: InboxItemDTO[]; nextCursor: string | null }> {
    const limit = options.limit || 20;
    const cursor = options.cursor;
    const filter = options.filter || InboxFilter.INBOX;
    const search = options.search || "";
    const sort = options.sort || "NEWEST";

    const filterQuery = EmailFilterService.buildFilterQuery(filter);
    const searchQuery = EmailSearchService.buildSearchQuery(search);

    const where = {
      userId,
      AND: [filterQuery, searchQuery]
    };

    let orderBy: any = { receivedAt: "desc" };
    if (sort === "OLDEST") {
      orderBy = { receivedAt: "asc" };
    } else if (sort === "SENDER") {
      orderBy = { fromName: "asc" };
    } else if (sort === "SUBJECT") {
      orderBy = { subject: "asc" };
    }

    const emails = await prisma.email.findMany({
      where,
      orderBy,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined
    });

    const hasNext = emails.length > limit;
    const pageEmails = emails.slice(0, limit);
    const nextCursor = hasNext ? pageEmails[pageEmails.length - 1].id : null;

    const pageThreadIds = Array.from(new Set(pageEmails.map(e => e.threadId)));
    const threadCountsMap = new Map<string, number>();

    if (pageThreadIds.length > 0) {
      const threadCounts = await prisma.email.groupBy({
        by: ["threadId"],
        _count: { id: true },
        where: { userId, threadId: { in: pageThreadIds } }
      });
      threadCounts.forEach(group => {
        threadCountsMap.set(group.threadId, group._count.id);
      });
    }

    let mappedDTOs: InboxItemDTO[] = pageEmails.map(email => ({
      id: email.id,
      threadId: email.threadId,
      gmailId: email.gmailId,
      from: email.from,
      fromName: email.fromName,
      to: email.to,
      subject: email.subject,
      body: email.body,
      snippet: email.snippet,
      receivedAt: email.receivedAt,
      status: email.status,
      hasAttachments: email.hasAttachments,
      labelIds: email.labelIds,
      messageCount: threadCountsMap.get(email.threadId) || 1
    }));

    if (search && search.trim()) {
      mappedDTOs = SearchRankerService.rankEmails(mappedDTOs, search);
    }

    return {
      items: mappedDTOs,
      nextCursor
    };
  }

  /**
   * Aggregates stats counts for dashboard folders.
   */
  static async getStats(userId: string) {
    const [unread, inbox, starred, trash, needsApproval] = await Promise.all([
      prisma.email.count({
        where: {
          userId,
          status: "UNREAD",
          NOT: { labelIds: { has: "TRASH" } }
        }
      }),
      prisma.email.count({
        where: {
          userId,
          labelIds: { has: "INBOX" },
          NOT: { labelIds: { has: "TRASH" } }
        }
      }),
      prisma.email.count({
        where: {
          userId,
          labelIds: { has: "STARRED" },
          NOT: { labelIds: { has: "TRASH" } }
        }
      }),
      prisma.email.count({
        where: {
          userId,
          labelIds: { has: "TRASH" }
        }
      }),
      prisma.email.count({
        where: {
          userId,
          status: "NEEDS_APPROVAL",
          NOT: { labelIds: { has: "TRASH" } }
        }
      })
    ]);

    return { unread, inbox, starred, trash, needsApproval };
  }
}
