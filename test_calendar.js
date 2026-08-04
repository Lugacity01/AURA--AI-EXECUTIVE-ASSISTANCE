const token = 'REDACTED';

const payload = {
  summary: "Test Event",
  description: "Testing API",
  start: {
    dateTime: new Date(Date.now() + 3600000).toISOString()
  },
  end: {
    dateTime: new Date(Date.now() + 7200000).toISOString()
  },
  conferenceData: {
    createRequest: {
      requestId: `meet-${Date.now()}`,
      conferenceSolutionKey: {
        type: "hangoutsMeet"
      }
    }
  }
};

fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
}).then(async res => {
  console.log(res.status, await res.text());
}).catch(console.error);
