import { prisma } from "../../lib/prisma";
import { TokenManager } from "./token-manager";
import { GmailClient } from "./gmail-client";
import { GmailHistory } from "./gmail-history";
import { EmailMapper } from "./email-mapper";
import { SyncSummary } from "./gmail-types";
import { AIService } from "../ai.service";

export class GmailSyncService {
  /**
   * Orchestrates the inbox synchronization flow for a user.
   * Handles concurrency locks, token refreshes, initial/incremental states, and fallback loops.
   */
  static async syncInbox(userId: string): Promise<SyncSummary> {
    const startTime = Date.now();
    
    // 1. Fetch connection details and check concurrency lock
    const connection = await prisma.emailConnection.findFirst({
      where: { userId, provider: "GMAIL", isActive: true }
    });

    if (!connection) {
      return {
        status: "FAILED",
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
        durationMs: 0,
        error: "Gmail connection not found or inactive"
      };
    }

    const lockTimeout = 5 * 60 * 1000; // 5 minutes lock expiry
    const isLocked = connection.isSyncing && 
      connection.syncStartedAt && 
      (Date.now() - connection.syncStartedAt.getTime() < lockTimeout);

    if (isLocked) {
      return {
        status: "IN_PROGRESS",
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        error: "Sync already in progress"
      };
    }

    // 2. Set Concurrency Lock
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        isSyncing: true,
        syncStartedAt: new Date()
      }
    });

    let currentAccessToken: string;
    try {
      currentAccessToken = await TokenManager.getValidAccessToken(userId);
    } catch (err: any) {
      // Release lock on credentials failure
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: { isSyncing: false }
      });
      return {
        status: "FAILED",
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        error: `Authentication failed: ${err.message}`
      };
    }

    const summary: SyncSummary = {
      status: "SUCCESS",
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
      durationMs: 0
    };

    try {
      let messageIdsToSync: string[] = [];
      let targetHistoryId = connection.lastHistoryId;
      let isIncremental = false;

      // 3. Select Sync Strategy: Incremental or Initial
      if (targetHistoryId) {
        try {
          const historyResult = await GmailHistory.getChangedMessageIds(currentAccessToken, targetHistoryId);
          messageIdsToSync = historyResult.messageIds;
          targetHistoryId = historyResult.latestHistoryId;
          isIncremental = true;
        } catch (err: any) {
          if (err.message.includes("GMAIL_HISTORY_EXPIRED")) {
            console.log("Gmail history expired. Falling back to initial sync.");
            targetHistoryId = null; // Clear cursor for initial sync fallback
          } else {
            throw err;
          }
        }
      }

      if (!targetHistoryId) {
        // Run Initial Sync
        const maxResults = process.env.GMAIL_INITIAL_SYNC_LIMIT 
          ? parseInt(process.env.GMAIL_INITIAL_SYNC_LIMIT) 
          : 50;

        const listResult = await GmailClient.listMessages(currentAccessToken, { maxResults });
        if (listResult.messages) {
          messageIdsToSync = listResult.messages.map(m => m.id);
        }

        // Fetch current profile to record baseline historyId
        const profile = await GmailClient.getProfile(currentAccessToken);
        targetHistoryId = profile.historyId;
      }

      // 4. Retrieve message details and perform idempotent upserts
      for (const msgId of messageIdsToSync) {
        try {
          const existingEmail = await prisma.email.findFirst({
            where: { userId, gmailId: msgId }
          });

          const fullMessage = await GmailClient.fetchMessage(currentAccessToken, msgId);
          const prismaInput = EmailMapper.mapGmailMessageToPrismaInput(userId, fullMessage);

          if (existingEmail) {
            // Check if updates are needed (e.g. labels or status changed)
            const labelsMatch = existingEmail.labelIds.length === prismaInput.labelIds.length && 
              existingEmail.labelIds.every(l => prismaInput.labelIds.includes(l));

            if (!labelsMatch || existingEmail.status !== prismaInput.status) {
              await prisma.email.update({
                where: { id: existingEmail.id },
                data: {
                  labelIds: prismaInput.labelIds,
                  status: prismaInput.status,
                  historyId: prismaInput.historyId
                }
              });
              summary.updated++;
            } else {
              summary.skipped++;
            }
          } else {
            await prisma.email.create({
              data: prismaInput
            });
            summary.created++;

            // Auto-sync sender to Contacts database
            try {
              const senderEmail = prismaInput.from;
              const senderName = prismaInput.fromName || senderEmail.split("@")[0];
              const existingContact = await prisma.contact.findFirst({
                where: { userId, email: senderEmail }
              });
              if (!existingContact) {
                // Determine company from email domain if possible
                let company = "";
                const domain = senderEmail.split("@")[1];
                if (domain && !["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com", "mail.com"].includes(domain)) {
                  company = domain.split(".")[0].split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                }

                await prisma.contact.create({
                  data: {
                    userId,
                    name: senderName,
                    email: senderEmail,
                    company: company || "External Contact",
                    notes: "Aura connected. Auto-generated via inbox sync."
                  }
                });
                console.log(`Auto-created contact during Gmail sync: ${senderName} (${senderEmail})`);
              }
            } catch (contactErr) {
              console.error("Failed to auto-create contact on sync:", contactErr);
            }
          }
        } catch (msgErr) {
          console.error(`Failed to sync message ${msgId}:`, msgErr);
          summary.failed++;
        }
      }

      // 5. Update Connection Sync Indicators and Release Lock
      summary.historyId = targetHistoryId || undefined;
      summary.durationMs = Date.now() - startTime;

      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          isSyncing: false,
          lastHistoryId: targetHistoryId,
          lastSuccessfulSync: new Date(),
          lastSyncedAt: new Date()
        }
      });

      return summary;
    } catch (err: any) {
      console.error("Gmail sync orchestrator panic:", err);
      // Release lock on fatal failures
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: { isSyncing: false }
      });

      return {
        status: "FAILED",
        created: summary.created,
        updated: summary.updated,
        deleted: 0,
        skipped: summary.skipped,
        failed: summary.failed + 1,
        durationMs: Date.now() - startTime,
        error: err.message
      };
    }
  }
}
