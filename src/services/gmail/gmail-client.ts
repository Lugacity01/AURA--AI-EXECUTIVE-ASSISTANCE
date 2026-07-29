export class GmailClient {
  /**
   * Fetches pages of user messages from Google's Gmail API.
   * Supports nextPageToken, maxResults, and query filter parameters (e.g. q).
   */
  static async listMessages(
    accessToken: string,
    options: { maxResults?: number; pageToken?: string; q?: string } = {}
  ): Promise<{ messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string; resultSizeEstimate?: number }> {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    
    if (options.maxResults) {
      url.searchParams.set("maxResults", String(options.maxResults));
    }
    if (options.pageToken) {
      url.searchParams.set("pageToken", options.pageToken);
    }
    if (options.q) {
      url.searchParams.set("q", options.q);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gmail listMessages failed:", errText);
      throw new Error(`Gmail API listMessages error: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetches full metadata and payload body parsed details of a specific Gmail message.
   */
  static async fetchMessage(accessToken: string, messageId: string): Promise<any> {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gmail fetchMessage ${messageId} failed:`, errText);
      throw new Error(`Gmail API fetchMessage error: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetches user profile data from Gmail (useful to retrieve current historyId).
   */
  static async getProfile(accessToken: string): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }> {
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Gmail API getProfile error: ${res.statusText}`);
    }

    return res.json();
  }
}
