export class GmailClient {
  /**
   * Sends an email using the Gmail API by constructing an RFC 2822 payload.
   */
  static async sendEmail(
    accessToken: string, 
    to: string, 
    subject: string, 
    htmlBody: string, 
    attachments: { filename: string, mimeType: string, fileData: string }[] = []
  ) {
    let emailLines: string[] = [];

    if (attachments.length > 0) {
      const boundary = `----=_Part_${Date.now().toString(16)}`;
      
      emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlBody,
        ""
      ];

      for (const att of attachments) {
        // fileData comes from the client as a data URL or raw base64. 
        // We need to strip the prefix if it's a data URL (e.g. data:image/png;base64,....)
        const base64Content = att.fileData.includes("base64,") ? att.fileData.split("base64,")[1] : att.fileData;

        emailLines.push(`--${boundary}`);
        emailLines.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
        emailLines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
        emailLines.push("Content-Transfer-Encoding: base64");
        emailLines.push("");
        
        // Chunk base64 string into 76 chars per line as per RFC
        const chunks = base64Content.match(/.{1,76}/g) || [];
        emailLines.push(...chunks);
        emailLines.push("");
      }

      emailLines.push(`--${boundary}--`);
    } else {
      emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        htmlBody
      ];
    }
    
    // Create base64url encoded string
    const rawEmail = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gmail sendEmail failed:", errText);
      throw new Error(`Gmail API sendEmail error: ${res.statusText}`);
    }

    return res.json();
  }

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
