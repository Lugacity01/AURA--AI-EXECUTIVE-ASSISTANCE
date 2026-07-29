import { Prisma } from "@prisma/client";

export class EmailSearchService {
  /**
   * Builds candidate filter query filters from trimmed search queries.
   */
  static buildSearchQuery(search: string): Prisma.EmailWhereInput {
    const trimmed = search.trim().replace(/\s+/g, " ");
    if (!trimmed) return {};

    const containsQuery = { contains: trimmed, mode: Prisma.QueryMode.insensitive };

    return {
      OR: [
        { subject: containsQuery },
        { from: containsQuery },
        { fromName: containsQuery },
        { to: containsQuery },
        { body: containsQuery },
        { bodyText: containsQuery },
        { snippet: containsQuery },
        { threadId: containsQuery },
        { gmailId: containsQuery },
      ]
    };
  }
}
