import { prisma } from "../../lib/prisma";
import { CampaignStatus } from "@prisma/client";
import { TokenManager } from "../gmail/token-manager";
import { GmailClient } from "../gmail/gmail-client";
import { CalendarService } from "../calendar/calendar.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

export class CampaignQueueService {
  /**
   * Dispatches a campaign to the job queue for processing.
   */
  static async scheduleCampaign(campaignId: string, userId: string, sendAt?: Date) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, userId }
    });

    if (!campaign) throw new Error("Campaign not found");

    // Auto-approve any drafts that are still GENERATED (assuming user launched without manually approving)
    await prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        approvalStatus: "GENERATED"
      },
      data: { approvalStatus: "APPROVED" }
    });

    // Create the queue job
    await prisma.campaignQueue.create({
      data: {
        campaignId,
        status: "QUEUED",
        nextRunAt: sendAt || new Date()
      }
    });

    // Update campaign status
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: sendAt ? CampaignStatus.SCHEDULED : CampaignStatus.SENDING,
        scheduledAt: sendAt || null
      }
    });

    // If immediate, start processing the queue in the background
    if (!sendAt) {
      CampaignQueueService.processQueue().catch(console.error);
    }

    return updated;
  }

  /**
   * Background processor. Pulls QUEUED jobs and dispatches emails via Gmail.
   */
  static async processQueue() {
    const jobs = await prisma.campaignQueue.findMany({
      where: {
        status: "QUEUED",
        nextRunAt: { lte: new Date() }
      },
      include: {
        campaign: true
      },
      take: 10
    });

    for (const job of jobs) {
      // Mark as processing
      await prisma.campaignQueue.update({
        where: { id: job.id },
        data: { status: "PROCESSING" }
      });

      let successfulSends = 0;
      let failedSends = 0;

      try {
        // Find approved recipients that are pending send
        const recipients = await prisma.campaignRecipient.findMany({
          where: {
            campaignId: job.campaignId,
            approvalStatus: "APPROVED",
            sendStatus: "PENDING"
          },
          include: {
            contact: true
          }
        });

        if (recipients.length > 0) {
          // Get the user's valid Google access token
          const accessToken = await TokenManager.getValidAccessToken(job.campaign.userId);

          // Fetch campaign attachments
          const dbAttachments = await prisma.campaignAttachment.findMany({
            where: { campaignId: job.campaignId }
          });
          const attachments = dbAttachments
            .filter(a => a.fileData && a.mimeType)
            .map(a => ({
              filename: a.originalFilename,
              mimeType: a.mimeType!,
              fileData: a.fileData!
            }));

          for (const recipient of recipients) {
            try {
              if (job.campaign.channel === "WHATSAPP") {
                if (!recipient.personalizedBody) {
                  throw new Error("Missing message body");
                }
                if (!recipient.contact.phone) {
                  throw new Error("No phone number");
                }

                await WhatsAppService.sendMessage(recipient.contact.phone, recipient.personalizedBody);

                await prisma.campaignRecipient.update({
                  where: { id: recipient.id },
                  data: {
                    sendStatus: "SENT",
                    sentAt: new Date()
                  }
                });
                successfulSends++;
              } else {
                if (!recipient.personalizedSubject || !recipient.personalizedBody || !recipient.contact.email) {
                  throw new Error("Missing subject, body, or email address");
                }

                let htmlBody = recipient.personalizedBody.replace(/\n/g, "<br>");

                if (job.campaign.campaignType === "MEETING") {
                  const eventStart = job.campaign.eventDate ? new Date(job.campaign.eventDate) : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
                  const durationMinutes = job.campaign.eventDuration || 30;

                  const eventEnd = new Date(eventStart.getTime() + durationMinutes * 60000);

                  try {
                    const calendarData = await CalendarService.createMeetingEvent(job.campaign.userId, {
                      summary: `Meeting: ${job.campaign.title}`,
                      description: recipient.personalizedSubject || "Meeting",
                      startTime: eventStart.toISOString(),
                      endTime: eventEnd.toISOString(),
                      attendeeEmails: [recipient.contact.email]
                    });
                    if (calendarData.meetLink) {
                      htmlBody += `<br><br><b>📅 Google Meet Link:</b> <a href="${calendarData.meetLink}">${calendarData.meetLink}</a>`;

                      const timeString = eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      const dateString = eventStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      htmlBody += `<br><i>A calendar invite has also been sent to your email for ${dateString} at ${timeString}.</i>`;
                    }
                  } catch (e) {
                    console.error("Failed to generate Google Meet link", e);
                  }
                }

                // Attempt dispatch via Gmail API
                await GmailClient.sendEmail(
                  accessToken,
                  recipient.contact.email,
                  recipient.personalizedSubject,
                  htmlBody,
                  attachments
                );

                await prisma.campaignRecipient.update({
                  where: { id: recipient.id },
                  data: {
                    sendStatus: "SENT",
                    sentAt: new Date()
                  }
                });

                await prisma.campaign.update({
                  where: { id: job.campaignId },
                  data: { emailsSent: { increment: 1 } }
                });

                successfulSends++;
              }
            } catch (err: any) {
              console.error(`Failed to send message to recipient ${recipient.id}:`, err);
              await prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: {
                  sendStatus: "FAILED",
                  failedReason: err.message
                }
              });

              await prisma.campaign.update({
                where: { id: job.campaignId },
                data: { failedRecipients: { increment: 1 } }
              });

              failedSends++;
            }
          }
        }

        // Job done
        await prisma.campaignQueue.update({
          where: { id: job.id },
          data: { status: "COMPLETED" }
        });

        // Update campaign stats and status
        await prisma.campaign.update({
          where: { id: job.campaignId },
          data: {
            status: CampaignStatus.COMPLETED
          }
        });

      } catch (err: any) {
        // Job Retry logic if token fetch fails or something catastrophic happens
        console.error(`Queue job failed for campaign ${job.campaignId}:`, err);
        await prisma.campaignQueue.update({
          where: { id: job.id },
          data: {
            status: job.attempts >= 3 ? "FAILED" : "QUEUED",
            attempts: job.attempts + 1,
            lastError: err.message,
            nextRunAt: new Date(Date.now() + 1000 * 60 * 5) // retry in 5 mins
          }
        });

        if (job.attempts >= 3) {
          await prisma.campaign.update({
            where: { id: job.campaignId },
            data: { status: "FAILED" }
          });
        }
      }
    }
  }
}
