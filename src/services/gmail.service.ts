import { prisma } from "../lib/prisma";
import { AIService } from "./ai.service";

export class GmailService {
  /**
   * Fetches all triage emails for a user. Seeds default records if none exist.
   */
  static async getEmails(userId: string) {
    const hasConnection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    if (hasConnection) {
      // Proactively clean up any default mock seed emails so they do not pollute the user's inbox
      await prisma.email.deleteMany({
        where: {
          userId,
          gmailId: { startsWith: "msg-" }
        }
      });
    }

    let emails = await prisma.email.findMany({
      where: { userId },
      include: { draft: true },
      orderBy: { receivedAt: "desc" }
    });

    if (emails.length === 0 && !hasConnection) {
      await this.seedDefaultData(userId);
      emails = await prisma.email.findMany({
        where: { userId },
        include: { draft: true },
        orderBy: { receivedAt: "desc" }
      });
    }

    return emails;
  }

  /**
   * Seeds database collections with standard specifications mock dataset.
   */
  static async seedDefaultData(userId: string) {
    // 1. Clear any existing records to keep it clean
    await prisma.email.deleteMany({ where: { userId } });
    await prisma.contact.deleteMany({ where: { userId } });
    await prisma.automationRule.deleteMany({ where: { userId } });
    await prisma.agentAction.deleteMany({ where: { userId } });

    // 2. Create default Automation Rules
    await prisma.automationRule.createMany({
      data: [
        { userId, title: "Automatically reply to trusted contacts", desc: "Sends drafts automatically if confidence matches 98%+ on contact whitelist.", enabled: true, lastExecuted: "10m ago", successRate: "99.8%" },
        { userId, title: "Require approval for new recipients", desc: "Flags threads for manual verification if email is not on CRM address book.", enabled: true, lastExecuted: "25m ago", successRate: "100%" },
        { userId, title: "Automatically archive newsletters", desc: "Archives robot notifications and newsletters without drafting replies.", enabled: true, lastExecuted: "Yesterday", successRate: "98.5%" },
        { userId, title: "Always ask before deleting emails", desc: "Requires explicit user confirmation before executing email trash dispatches.", enabled: true, lastExecuted: "Never", successRate: "100%" },
        { userId, title: "Summarize unread emails every morning", desc: "Sends a compiled executive morning overview summary via slack notification.", enabled: false, lastExecuted: "Today 08:00 AM", successRate: "99.2%" }
      ]
    });

    // 3. Create default Contacts
    await prisma.contact.createMany({
      data: [
        { userId, name: "Sarah Jenkins", email: "sarah.j@apex-tech.com", company: "Apex Technology Partners", phone: "+1 (555) 019-2834", notes: "CEO and founder. Communication preference: Direct, Action-oriented. Frequently schedules Google Meet slots." },
        { userId, name: "David Chen", email: "investor@chen-capital.com", company: "Chen Capital Group", phone: "+1 (555) 043-9821", notes: "Lead Investor. Communication style: Metric-driven, formal summaries. Tracks budget burn rates closely." },
        { userId, name: "Marcus Vance", email: "marcus.v@stripe.com", company: "Stripe Billing Integrations", phone: "+1 (555) 098-1122", notes: "Partner Manager. Communication style: Developer-focused. Assists with PCI compliance checkins." }
      ]
    });

    // 4. Create default Emails and AI Drafts
    const emailData = [
      {
        gmailId: "msg-1",
        threadId: "thread-1",
        from: "Sarah Jenkins",
        fromName: "Sarah Jenkins",
        to: "alex@aura-user.com",
        subject: "Q3 Product Strategy Deck Review",
        body: "Hi Alex,\n\nI just went through the Q3 strategy slides. We need to align on the pricing page restructuring before showing it to the advisory board on Friday. Do you have 20 minutes to jump on a quick call today afternoon? Let me know your availability.\n\nBest,\nSarah",
        receivedAt: new Date(Date.now() - 1000 * 60 * 15), // 15m ago
        status: "NEEDS_APPROVAL" as any
      },
      {
        gmailId: "msg-2",
        threadId: "thread-2",
        from: "David Chen",
        fromName: "David Chen",
        to: "alex@aura-user.com",
        subject: "Q3 Investor Sync Scheduling",
        body: "Hey Alex,\n\nChecking in on the schedule for next week's partner sync. Does Tuesday morning at 10 AM work for your team? I want to make sure we cover the budget details.\n\nDavid",
        receivedAt: new Date(Date.now() - 1000 * 60 * 45), // 45m ago
        status: "NEEDS_APPROVAL" as any
      },
      {
        gmailId: "msg-3",
        threadId: "thread-3",
        from: "Marcus Vance",
        fromName: "Marcus Vance",
        to: "alex@aura-user.com",
        subject: "Partnership Agreement Contract Review",
        body: "Hi Alex,\n\nWe've completed the initial draft of our API integration partnership contract. Please review Section 4 regarding pricing updates and billing responsibilities before signing.\n\nMarcus",
        receivedAt: new Date(Date.now() - 1000 * 60 * 120), // 2h ago
        status: "UNREAD" as any
      },
      {
        gmailId: "msg-4",
        threadId: "thread-4",
        from: "GitHub Notifications",
        fromName: "GitHub Notifications",
        to: "alex@aura-user.com",
        subject: "[AURA] Pull Request #14 merged by dependabot",
        body: "Dependabot merged pull request #14: Bump next-auth from 4.2.0 to 4.2.2. All tests passed. Deploying successful to staging.",
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        status: "APPROVED" as any
      }
    ];

    for (const e of emailData) {
      const emailRecord = await prisma.email.create({
        data: {
          gmailId: e.gmailId,
          threadId: e.threadId,
          from: e.from,
          fromName: e.fromName,
          to: e.to,
          subject: e.subject,
          body: e.body,
          receivedAt: e.receivedAt,
          status: e.status,
          userId,
          summary: AIService.classifyIntent(e.body) === "Schedule Sync" 
            ? `CEO Sarah Jenkins is requesting a brief 20-minute discussion this afternoon to align on the Q3 product strategy slides and pricing page adjustments.` 
            : `Review and confirm operational updates.`
        }
      });

      // Run AI logic to create associated Draft response
      const generated = AIService.generateDrafts(e.body, e.from);
      const risk = AIService.assessRisk(e.body, e.from, e.subject);

      await prisma.emailDraft.create({
        data: {
          emailId: emailRecord.id,
          draftContent: generated.draft,
          riskLevel: risk.risk,
          riskAnalysis: risk.reason,
          confidence: generated.confidence,
          isApproved: e.status === "APPROVED",
          userId,
          recipient: e.from,
          subject: `Re: ${e.subject}`,
          body: generated.draft,
          status: e.status === "APPROVED" ? "Sent" : e.status === "NEEDS_APPROVAL" ? "Needs Approval" : "Draft",
          threadId: e.threadId
        }
      });
    }

    // 5. Create default Activity Log logs
    await prisma.agentAction.createMany({
      data: [
        { userId, action: "Read Email", desc: "Fetched incoming email thread from Sarah Jenkins (Apex Tech)", status: "Completed", timestamp: new Date(Date.now() - 1000 * 60 * 15), reason: "Standard inbox sync monitoring hook triggered.", toolUsed: "Gmail API / OAuth client", duration: "450ms", outcome: "Successfully indexed email msg-1 and stored to DB." },
        { userId, action: "Assessed Risk Levels", desc: "Ran compliance audits on Sarah Jenkins's pricing slides review request", status: "Completed", timestamp: new Date(Date.now() - 1000 * 60 * 14), reason: "Mandatory safety scan on strategy deck keywords.", toolUsed: "Aura Risk Assessment Classifier", duration: "310ms", outcome: "LOW RISK. Flags cleared. No legal bindings found." },
        { userId, action: "Generated Response Draft", desc: "Created draft reply options for Sarah Jenkins", status: "Completed", timestamp: new Date(Date.now() - 1000 * 60 * 13), reason: "Auto-drafting pipeline active.", toolUsed: "OpenAI GPT-4o context model", duration: "1.2s", outcome: "Draft generated with 96% match confidence score." },
        { userId, action: "Approval Requested", desc: "Forwarded Microsoft Procurement draft response to manual verification deck", status: "Waiting", timestamp: new Date(Date.now() - 1000 * 60 * 12), reason: "Requires manual check: high risk billing restructure terms detected in attachment.", toolUsed: "Triage Approvals Hub queue router", duration: "80ms", outcome: "Pending user authorization confirmation." },
        { userId, action: "Email Dispatched", desc: "Sent auto-reply confirmation to dependabot merge notifications", status: "Completed", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), reason: "Automated webhook reply rules active.", toolUsed: "Gmail dispatch client / SMTP", duration: "600ms", outcome: "Dispatched successfully. Delivery receipt status = 200." }
      ]
    });
  }

  /**
   * Updates an email's status.
   */
  static async updateEmailStatus(emailId: string, status: any) {
    return prisma.email.update({
      where: { id: emailId },
      data: { status }
    });
  }

  static async getGmailConnectionStatus(userId: string) {
    const connection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    if (!connection || !connection.accessToken) {
      return { status: "NOT_CONNECTED", email: null };
    }

    const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days grace threshold

    if (connection.accessToken === "managed-by-better-auth") {
      const account = await prisma.account.findFirst({
        where: { userId, providerId: "google" }
      });

      if (!account || !account.accessToken) {
        return { status: "NOT_CONNECTED", email: connection.emailAddress };
      }

      if (account.accessTokenExpiresAt && new Date() > new Date(account.accessTokenExpiresAt.getTime() + gracePeriodMs)) {
        if (!account.refreshToken) {
          return { status: "REVOKED", email: connection.emailAddress };
        }
      }

      return { status: "CONNECTED", email: connection.emailAddress };
    }

    if (connection.expiresAt && new Date() > new Date(connection.expiresAt.getTime() + gracePeriodMs)) {
      if (!connection.refreshToken) {
        return { status: "REVOKED", email: connection.emailAddress };
      }
    }

    return { status: "CONNECTED", email: connection.emailAddress };
  }

  /**
   * Idempotent connect Gmail: creates or updates the EmailConnection record.
   * Handles refresh token preservation if none is returned by Google on reconnect.
   */
  static async connectGmail(
    userId: string,
    data: {
      email: string;
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
      providerUserId?: string;
      displayName?: string;
      avatarUrl?: string;
      scope?: string;
    }
  ) {
    const existing = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL" }
    });

    const finalRefreshToken = data.refreshToken || (existing ? existing.refreshToken : null);

    if (existing) {
      return prisma.emailConnection.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          emailAddress: data.email,
          accessToken: data.accessToken,
          refreshToken: finalRefreshToken,
          expiresAt: data.expiresAt || null,
          providerUserId: data.providerUserId || existing.providerUserId,
          displayName: data.displayName || existing.displayName,
          avatarUrl: data.avatarUrl || existing.avatarUrl,
          scope: data.scope || existing.scope,
          connectedAt: new Date()
        }
      });
    } else {
      return prisma.emailConnection.create({
        data: {
          userId,
          provider: "GMAIL",
          emailAddress: data.email,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || null,
          expiresAt: data.expiresAt || null,
          providerUserId: data.providerUserId || null,
          displayName: data.displayName || null,
          avatarUrl: data.avatarUrl || null,
          scope: data.scope || null,
          isActive: true,
          connectedAt: new Date()
        }
      });
    }
  }

  /**
   * Disconnects Gmail: revokes the Google refresh token if available, nullifies credentials, and sets isActive: false.
   */
  static async disconnectGmail(userId: string) {
    const existing = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL" }
    });

    if (existing) {
      if (existing.refreshToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(existing.refreshToken)}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
        } catch (err) {
          console.error("Failed to revoke Google refresh token:", err);
        }
      }

      return prisma.emailConnection.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          accessToken: null,
          refreshToken: null,
          expiresAt: null
        }
      });
    }
  }
}
