import { prisma } from "../../lib/prisma";
import { Prisma, CampaignStatus, CampaignRecipientStatus } from "@prisma/client";

export class CampaignService {
  static async getCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      include: {
        audience: true,
        template: true,
        _count: {
          select: { recipients: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getCampaignById(campaignId: string, userId: string) {
    return prisma.campaign.findUnique({
      where: { id: campaignId, userId },
      include: {
        recipients: {
          include: { contact: { include: { organization: true } } }
        },
        attachments: true,
        template: true
      }
    });
  }

  static async createCampaign(userId: string, data: Omit<Prisma.CampaignCreateInput, "userId" | "id" | "status">) {
    return prisma.campaign.create({
      data: {
        ...data,
        userId,
        status: CampaignStatus.DRAFT
      }
    });
  }

  static async updateCampaign(campaignId: string, userId: string, data: Prisma.CampaignUpdateInput) {
    return prisma.campaign.update({
      where: { id: campaignId, userId },
      data
    });
  }

  static async deleteCampaign(campaignId: string, userId: string) {
    // Note: In a real app we might soft-delete or cascade delete recipients, 
    // but Prisma will handle cascade if configured, or we can just delete the root.
    return prisma.campaign.delete({
      where: { id: campaignId, userId }
    });
  }

  static async addRecipients(campaignId: string, userId: string, contactIds: string[]) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, userId } });
    if (!campaign) throw new Error("Campaign not found");

    const creations = contactIds.map(contactId => ({
      campaignId,
      contactId,
      approvalStatus: CampaignRecipientStatus.PENDING,
      sendStatus: CampaignRecipientStatus.PENDING
    }));

    await prisma.campaignRecipient.createMany({
      data: creations
    });

    // Update analytics
    const total = await prisma.campaignRecipient.count({ where: { campaignId } });
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: total, pendingRecipients: total }
    });

    return total;
  }

  static async bulkApproveRecipients(campaignId: string, userId: string, recipientIds: string[]) {
    // Basic implementation of bulk approval
    const res = await prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        id: { in: recipientIds },
        campaign: { userId }, // ensures security
        approvalStatus: { not: CampaignRecipientStatus.APPROVED }
      },
      data: {
        approvalStatus: CampaignRecipientStatus.APPROVED,
        approvedAt: new Date()
      }
    });

    // Re-aggregate analytics here in a real scenario
    return res.count;
  }
}
