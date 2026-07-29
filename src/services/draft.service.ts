import { prisma } from "../lib/prisma";
import { AIService } from "./ai.service";
import OpenAI from "openai";
import { TokenManager } from "./gmail/token-manager";

export class DraftService {
  /**
   * Fetches all AI drafts for a user.
   */
  static async getDrafts(userId: string) {
    return prisma.emailDraft.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Updates an existing draft's contents.
   */
  static async updateDraft(draftId: string, content: string) {
    return prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        draftContent: content,
        body: content
      }
    });
  }

  /**
   * Approves and schedules a draft for email dispatch.
   */
  static async approveDraft(draftId: string) {
    const draft = await prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { email: true }
    });

    if (!draft) {
      throw new Error("Draft not found");
    }

    const userId = draft.userId || draft.email.userId;

    // 1. Fetch valid Gmail API access token
    let accessToken: string;
    try {
      accessToken = await TokenManager.getValidAccessToken(userId);
    } catch (tokenErr: any) {
      console.error("Failed to retrieve valid Gmail access token for dispatch:", tokenErr);
      throw new Error(`Google Authentication required: ${tokenErr.message}`);
    }

    // 2. Compose raw RFC 2822 email payload for threading compliance
    const recipient = draft.recipient || draft.email.from;
    const subject = draft.subject || `Re: ${draft.email.subject}`;
    const bodyContent = draft.draftContent;
    const gmailId = draft.email.gmailId;
    const threadId = draft.threadId || draft.email.threadId;

    const rawHeaders = [
      `To: ${recipient}`,
      `Subject: ${subject}`,
      `In-Reply-To: <${gmailId}>`,
      `References: <${gmailId}>`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      "",
      bodyContent
    ];

    const rawMessage = rawHeaders.join("\r\n");
    const encodedRaw = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 3. Send email via Google's messages.send API
    console.log(`Dispatching email to ${recipient} on Gmail thread: ${threadId}`);
    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedRaw,
        threadId: threadId,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Gmail API send endpoint error response:", errText);
      throw new Error(`Gmail API sending failed: ${sendRes.statusText} (${errText})`);
    }

    // 4. Update database statuses on success
    const updatedDraft = await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        status: "Approved"
      }
    });

    await prisma.email.update({
      where: { id: draft.emailId },
      data: { status: "APPROVED" }
    });

    // 5. Create action log entry
    await prisma.agentAction.create({
      data: {
        userId,
        action: "Email Dispatched",
        desc: `Sent approved response to ${recipient}`,
        status: "Completed",
        reason: "User manual verification click.",
        toolUsed: "Gmail API Outbox dispatch",
        duration: "650ms",
        outcome: "Approved & sent successfully via Gmail API."
      }
    });

    return updatedDraft;
  }

  /**
   * Rejects and archives a draft.
   */
  static async archiveDraft(draftId: string) {
    const draft = await prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: "Archived"
      }
    });

    await prisma.email.update({
      where: { id: draft.emailId },
      data: { status: "IGNORED" }
    });

    await prisma.agentAction.create({
      data: {
        userId: draft.userId || "system",
        action: "Draft Archived",
        desc: `Archived draft response to ${draft.recipient}`,
        status: "Completed",
        reason: "User manual skip/archive action.",
        toolUsed: "Database client",
        duration: "50ms",
        outcome: "Skipped & moved to archive logs."
      }
    });

    return draft;
  }

  /**
   * Generates a tailored AI response draft for a specific email using the Google Gemma/Gemini model.
   */
  static async generateDraftForEmail(emailId: string, userId: string) {
    const email = await prisma.email.findUnique({
      where: { id: emailId }
    });
    if (!email) {
      throw new Error("Email thread not found");
    }

    const senderName = email.fromName || email.from;
    const bodyContent = email.bodyText || email.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
      baseURL: "https://openrouter.ai/api/v1",
    });

    const systemPrompt = `You are Aura, an executive AI assistant.
Draft a professional, helpful email response on behalf of Yinka.
Below is the incoming email detail:
From: ${senderName}
Subject: ${email.subject}
Content:
${bodyContent}

Your draft should address the sender's points, suggest a positive next step, and maintain a highly professional, concise tone. Output ONLY the response body without subject lines, salutation templates (like [Your Name]), or extra text.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "google/gemma-4-26b-a4b-it:free",
      messages: [
        { role: "system", content: systemPrompt }
      ]
    });

    const draftText = completion.choices[0]?.message?.content || "Thank you for the message. I will review and coordinate details soon.";
    const risk = AIService.assessRisk(bodyContent, email.from, email.subject);

    // Upsert or create draft record
    const draft = await prisma.emailDraft.upsert({
      where: { emailId: email.id },
      create: {
        emailId: email.id,
        draftContent: draftText,
        riskLevel: risk.risk,
        riskAnalysis: risk.reason,
        confidence: 90.0,
        isApproved: false,
        userId,
        recipient: email.from,
        subject: `Re: ${email.subject}`,
        body: draftText,
        status: "Draft",
        threadId: email.threadId
      },
      update: {
        draftContent: draftText,
        riskLevel: risk.risk,
        riskAnalysis: risk.reason,
        body: draftText,
        status: "Draft"
      }
    });

    return draft;
  }
}
