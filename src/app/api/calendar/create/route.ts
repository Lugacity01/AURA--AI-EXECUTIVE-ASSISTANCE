import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { TokenManager } from "@/services/gmail/token-manager";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, summary, description, startTime, endTime, createMeet } = body;

    if (!recipientEmail || !summary || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Fetch valid Google OAuth token
    const accessToken = await TokenManager.getValidAccessToken(session.user.id);

    // 2. Build Google Calendar Event payload
    const eventPayload: any = {
      summary,
      description: description || "Scheduled via AI Email Support Assistant.",
      start: {
        dateTime: startTime,
      },
      end: {
        dateTime: endTime,
      },
      attendees: [
        { email: recipientEmail }
      ],
    };

    // If Google Meet link creation is requested
    if (createMeet) {
      eventPayload.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      };
    }

    // 3. Post to Google Calendar API
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("sendUpdates", "all");
    if (createMeet) {
      url.searchParams.set("conferenceDataVersion", "1");
    }

    console.log(`Booking calendar event for ${recipientEmail}: ${summary}`);
    const calendarRes = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    if (!calendarRes.ok) {
      const errText = await calendarRes.text();
      console.error("Google Calendar API error response:", errText);
      if (calendarRes.status === 403) {
        throw new Error("Calendar access permissions are missing. Please go to Settings > Integrations, click Disconnect on Gmail, and then connect it again to grant Google Calendar access permissions.");
      }
      throw new Error(`Google Calendar API failed: ${calendarRes.statusText} (${errText})`);
    }

    const eventData = await calendarRes.json();

    // 4. Log Agent Action
    await prisma.agentAction.create({
      data: {
        userId: session.user.id,
        action: "Calendar Event Created",
        desc: `Booked "${summary}" with ${recipientEmail}`,
        status: "Completed",
        reason: "User scheduled calendar sync from dashboard workspace.",
        toolUsed: "Google Calendar Event Dispatcher",
        duration: "720ms",
        outcome: `Event created successfully. Meet Link: ${eventData.hangoutLink || "N/A"}`
      }
    });

    return NextResponse.json({
      success: true,
      htmlLink: eventData.htmlLink,
      meetLink: eventData.hangoutLink || null,
      eventId: eventData.id
    });
  } catch (error: any) {
    console.error("Calendar scheduling error:", error);
    
    // Check if it's the specific missing permissions error
    if (error.message && error.message.includes("Calendar access permissions are missing")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
