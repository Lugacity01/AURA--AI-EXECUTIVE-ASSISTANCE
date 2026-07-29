import { InboxItemDTO } from "./inbox.types";

export class SearchRankerService {
  /**
   * Evaluates a match score for an email DTO item.
   */
  static getRelevanceScore(email: InboxItemDTO, search: string): number {
    const term = search.toLowerCase().trim().replace(/\s+/g, " ");
    if (!term) return 0;

    let score = 0;

    const subject = (email.subject || "").toLowerCase();
    const from = (email.from || "").toLowerCase();
    const fromName = (email.fromName || "").toLowerCase();
    const snippet = (email.snippet || "").toLowerCase();

    if (subject.includes(term)) {
      score += 10;
      if (subject.startsWith(term)) score += 5;
    }

    if (from.includes(term) || fromName.includes(term)) {
      score += 5;
    }

    if (snippet.includes(term)) {
      score += 2;
    }

    return score;
  }

  /**
   * Sorts candidate emails in-memory by computed relevance score.
   */
  static rankEmails(emails: InboxItemDTO[], search: string): InboxItemDTO[] {
    if (!search || !search.trim()) return emails;

    const scored = emails.map(email => ({
      email,
      score: this.getRelevanceScore(email, search)
    }));

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.email.receivedAt.getTime() - a.email.receivedAt.getTime())
      .map(item => item.email);
  }
}
