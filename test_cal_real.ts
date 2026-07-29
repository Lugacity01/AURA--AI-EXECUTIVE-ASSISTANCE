import { TokenManager } from './src/services/gmail/token-manager';

async function main() {
  try {
    const userId = 'PwXFxgkecq0MMb5kdn0bQH87mXLqSA5Y'; // from db output earlier
    const token = await TokenManager.getValidAccessToken(userId);
    console.log("Got token.");
    
    const payload = {
      summary: "Test Event",
      start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
      attendees: [{ email: "yinkaabeebadesina@gmail.com" }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    };

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("sendUpdates", "all");
    url.searchParams.set("conferenceDataVersion", "1");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();
    console.log("Calendar API Response:", status, text);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
main()
