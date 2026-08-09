export class GmailHistory {
  /**
   * Lists changes in Gmail history starting from a given historyId.
   * Returns a list of message IDs that were added or modified.
   */
  static async getChangedMessageIds(
    accessToken: string,
    startHistoryId: string
  ): Promise<{ messageIds: string[]; latestHistoryId: string }> {
    const messageIdsSet = new Set<string>();
    let latestHistoryId = startHistoryId;
    let pageToken: string | undefined = undefined;
    let finalHistoryId: string | undefined = undefined;

    do {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
      url.searchParams.set("startHistoryId", startHistoryId);
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Gmail getHistory since ${startHistoryId} failed:`, errText);
        throw new Error(`GMAIL_HISTORY_EXPIRED: ${res.statusText}`);
      }

      const data = await res.json();
      finalHistoryId = data.historyId;

      if (data.history && Array.isArray(data.history)) {
        for (const record of data.history) {
          if (record.id && parseInt(record.id) > parseInt(latestHistoryId)) {
            latestHistoryId = record.id;
          }

          // Check messages added or labels modified
          if (record.messagesAdded && Array.isArray(record.messagesAdded)) {
            for (const item of record.messagesAdded) {
              if (item.message && item.message.id) {
                messageIdsSet.add(item.message.id);
              }
            }
          }
          
          if (record.labelsAdded && Array.isArray(record.labelsAdded)) {
            for (const item of record.labelsAdded) {
              if (item.message && item.message.id) {
                messageIdsSet.add(item.message.id);
              }
            }
          }

          if (record.labelsRemoved && Array.isArray(record.labelsRemoved)) {
            for (const item of record.labelsRemoved) {
              if (item.message && item.message.id) {
                messageIdsSet.add(item.message.id);
              }
            }
          }
        }
      }
      
      pageToken = data.nextPageToken;
    } while (pageToken);

    return {
      messageIds: Array.from(messageIdsSet),
      latestHistoryId: finalHistoryId || latestHistoryId
    };
  }
}
