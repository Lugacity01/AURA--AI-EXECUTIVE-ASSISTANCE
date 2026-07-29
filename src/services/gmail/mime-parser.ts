export class MimeParser {
  /**
   * Decodes Gmail base64url encoded strings safely.
   */
  static decodeBase64(data: string): string {
    if (!data) return "";
    // Replace URL-safe characters back to standard base64
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  /**
   * Recursively parses the Gmail payload parts to extract bodyText, bodyHtml, and whether it has attachments.
   */
  static parsePayload(payload: any): { bodyText: string; bodyHtml: string; hasAttachments: boolean } {
    const result = {
      bodyText: "",
      bodyHtml: "",
      hasAttachments: false
    };

    if (!payload) return result;

    // Check if attachments are present in this part
    if (payload.filename && payload.body && payload.body.attachmentId) {
      result.hasAttachments = true;
    }

    // Direct body data
    if (payload.body && payload.body.data) {
      const decoded = this.decodeBase64(payload.body.data);
      if (payload.mimeType === "text/plain") {
        result.bodyText = decoded;
      } else if (payload.mimeType === "text/html") {
        result.bodyHtml = decoded;
      }
    }

    // Traversal of subparts
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts) {
        const partResult = this.parsePayload(part);
        
        if (partResult.bodyText) {
          result.bodyText += (result.bodyText ? "\n" : "") + partResult.bodyText;
        }
        if (partResult.bodyHtml) {
          result.bodyHtml += (result.bodyHtml ? "\n" : "") + partResult.bodyHtml;
        }
        if (partResult.hasAttachments) {
          result.hasAttachments = true;
        }
      }
    }

    return result;
  }
}
