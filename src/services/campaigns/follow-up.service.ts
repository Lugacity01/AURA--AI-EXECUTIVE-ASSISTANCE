import { prisma } from "../../lib/prisma";
import { CampaignStatus, CampaignRecipientStatus, FollowUpType, Prisma } from "@prisma/client";
import { CampaignQueueService } from "../contacts/campaign-queue.service";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-or') ? 'https://openrouter.ai/api/v1' : undefined
});

export class FollowUpService {
  /**
   * Orchestrates the creation of a follow-up campaign and triggers generation.
   */
  static async create(
    originalCampaignId: string, 
    userId: string, 
    followUpType: FollowUpType, 
    recipientFilter: "ALL" | "PENDING_RESPONSE" | "CUSTOM",
    additionalInstructions: string,
    customRecipientIds: string[] = [],
    masterSubject?: string,
    masterBody?: string,
    includeMeetLink: boolean = true
  ) {
    // 1. Fetch original campaign
    const originalCampaign = await prisma.campaign.findUnique({
      where: { id: originalCampaignId, userId },
      include: {
        template: true,
        attachments: true,
        recipients: {
          include: { contact: { include: { organization: true, activities: true } } }
        }
      }
    });

    if (!originalCampaign) throw new Error("Original campaign not found");

    // 2. Filter recipients
    let filteredRecipients = originalCampaign.recipients;
    if (recipientFilter === "PENDING_RESPONSE") {
      // Pending response means they were sent an email but haven't replied
      filteredRecipients = originalCampaign.recipients.filter(r => r.sendStatus === "SENT" && r.repliedAt === null);
    } else if (recipientFilter === "CUSTOM") {
      filteredRecipients = originalCampaign.recipients.filter(r => customRecipientIds.includes(r.id));
    }

    if (filteredRecipients.length === 0) {
      throw new Error("No valid recipients found for this follow-up filter");
    }

    // 3. Create the child campaign shell
    const childCampaign = await prisma.campaign.create({
      data: {
        title: `${originalCampaign.title} - Follow-up`,
        description: originalCampaign.description,
        campaignType: originalCampaign.campaignType,
        audience: originalCampaign.audienceId ? { connect: { id: originalCampaign.audienceId } } : undefined,
        parentCampaign: { connect: { id: originalCampaign.id } },
        followUpType: followUpType,
        userId: userId,
        status: CampaignStatus.GENERATING, // Start in generating state
        template: originalCampaign.templateId ? { connect: { id: originalCampaign.templateId } } : undefined,
        includeMeetLink: includeMeetLink,
        meetLink: originalCampaign.meetLink // Copy parent's meetLink over just in case
      }
    });

    // 4. Clone Attachments
    if (originalCampaign.attachments.length > 0) {
      const attachmentsData = originalCampaign.attachments.map(att => ({
        campaignId: childCampaign.id,
        originalFilename: att.originalFilename,
        storageKey: att.storageKey,
        mimeType: att.mimeType,
        size: att.size,
        fileData: att.fileData
      }));
      await prisma.campaignAttachment.createMany({ data: attachmentsData });
    }

    // 5. Create Recipient records and store context
    // If masterBody is provided, we skip AI generation and use it directly.
    const isMasterMode = !!masterBody && !!masterSubject;
    
    const recipientCreations = filteredRecipients.map(r => {
      const body = isMasterMode ? masterBody!.replace(/\[Name\]/gi, r.contact.name || "there") : undefined;
      return {
        campaignId: childCampaign.id,
        contactId: r.contactId,
        approvalStatus: isMasterMode ? CampaignRecipientStatus.APPROVED : CampaignRecipientStatus.PENDING,
        sendStatus: CampaignRecipientStatus.PENDING,
        personalizedSubject: masterSubject,
        personalizedBody: body,
        approvedAt: isMasterMode ? new Date() : null,
        generatedAt: isMasterMode ? new Date() : null,
        personalizationContext: JSON.stringify({
          originalSubject: r.personalizedSubject,
          originalBody: r.personalizedBody,
          additionalInstructions
        })
      };
    });

    await prisma.campaignRecipient.createMany({ data: recipientCreations });

    // Update initial analytics
    await prisma.campaign.update({
      where: { id: childCampaign.id },
      data: { totalRecipients: recipientCreations.length, pendingRecipients: recipientCreations.length }
    });

    if (isMasterMode) {
      // Mark as SCHEDULED and queue immediately
      await prisma.campaign.update({
        where: { id: childCampaign.id },
        data: { status: CampaignStatus.SCHEDULED, scheduledAt: new Date() }
      });
      await CampaignQueueService.scheduleCampaign(childCampaign.id, userId);
    } else {
      // 6. Trigger async AI generation for hyper-personalization if no master is provided
      FollowUpService.generateAllForFollowUp(childCampaign.id, originalCampaignId, userId, additionalInstructions).catch(console.error);
    }

    return childCampaign;
  }

  /**
   * Generates AI drafts for the follow-up campaign
   */
  static async generateAllForFollowUp(childCampaignId: string, originalCampaignId: string, userId: string, additionalInstructions: string) {
    const childCampaign = await prisma.campaign.findUnique({
      where: { id: childCampaignId, userId },
      include: {
        recipients: {
          include: { 
            contact: { include: { organization: true, activities: true } }
          }
        }
      }
    });

    const originalCampaign = await prisma.campaign.findUnique({
      where: { id: originalCampaignId }
    });

    if (!childCampaign || !originalCampaign) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const senderName = user?.name || "User";

    for (const recipient of childCampaign.recipients) {
      try {
        // Extract original context saved during creation
        const contextObj = recipient.personalizationContext ? JSON.parse(recipient.personalizationContext) : {};
        const { originalSubject, originalBody } = contextObj;

        const systemPrompt = `You are Aura, an elite Executive AI Assistant.
Your goal is to write a highly personalized, professional follow-up email based on the previous interaction.
The email should sound human, warm, but incredibly sharp.
Output exactly as a JSON object with 'subject' and 'body' string properties. Do not wrap in markdown or backticks.
Use '[Name]' as the placeholder for the recipient's name (e.g. "Hi [Name],") if you don't know it, otherwise use their actual name.
Preserve exact signatures if requested, otherwise sign off as: ${senderName}`;

        const userPrompt = `
Follow-up Instructions:
${additionalInstructions}

Original Campaign Goal:
${originalCampaign.description || ""}

Original Email Sent to Recipient:
Subject: ${originalSubject || "N/A"}
Body:
${originalBody || "N/A"}

Recipient Context:
- Name: ${recipient.contact.name}
- Company: ${recipient.contact.organization?.name || recipient.contact.company || ""}
- Job Title: ${recipient.contact.jobTitle || ""}

Write the follow-up email naturally referencing the previous email if necessary.
`;

        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        });

        const parsed = JSON.parse(response.choices[0].message.content || "{}");
        
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            personalizedSubject: parsed.subject || `Re: ${originalSubject}`,
            personalizedBody: parsed.body,
            approvalStatus: CampaignRecipientStatus.GENERATED,
            generatedAt: new Date()
          }
        });

      } catch (err) {
        console.error(`Failed to generate follow-up for recipient ${recipient.id}:`, err);
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { 
            approvalStatus: CampaignRecipientStatus.FAILED,
            failedReason: err instanceof Error ? err.message : "Unknown AI generation error"
          }
        });
      }
    }

    // Mark campaign as READY for review
    await prisma.campaign.update({
      where: { id: childCampaignId },
      data: { status: CampaignStatus.READY }
    });
  }
}
