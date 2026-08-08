import { prisma } from "../../lib/prisma";
import { CampaignRecipientStatus, CampaignStatus } from "@prisma/client";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-or') ? 'https://openrouter.ai/api/v1' : undefined
});

export class CampaignPersonalizationService {
  /**
   * Generates a personalized draft for a single recipient using the campaign's base prompt/template
   * and the contact's explicit context.
   */
  static async generateForRecipient(recipientId: string, userId: string, senderName: string = "User") {
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        contact: { include: { organization: true, activities: true, tags: { include: { tag: true } } } },
        campaign: { include: { template: true } }
      }
    });

    if (!recipient || recipient.campaign.userId !== userId) throw new Error("Unauthorized or not found");

    const contact = recipient.contact;
    const campaign = recipient.campaign;
    const template = campaign.template;

    // 1. Build the explicit context payload
    const personalizationContext = {
      recipientName: contact.name,
      company: contact.organization?.name || contact.company || "",
      jobTitle: contact.jobTitle || "",
      department: contact.department || "",
      notes: contact.notes || "",
      aiSummary: contact.aiSummary || "",
      preferredTone: contact.preferredTone || "Professional",
      campaignGoal: campaign.description || "",
      basePrompt: template?.basePrompt || "",
      senderName
    };

    // 1.5 Pre-process the base prompt to substitute obvious template variables
    // This guarantees variables are injected even if the AI is stubborn
    let processedPrompt = personalizationContext.basePrompt || personalizationContext.campaignGoal;
    if (processedPrompt) {
      processedPrompt = processedPrompt
        .replace(/\[Name\]|\[Student's Name\]|\[Student Name\]/gi, personalizationContext.recipientName)
        .replace(/\[Company\]|\[Track\]|\[Company Name\]/gi, personalizationContext.company)
        .replace(/\[Job Title\]|\[Title\]/gi, personalizationContext.jobTitle)
        .replace(/\[Department\]/gi, personalizationContext.department);
      
      // Update the context so the AI gets the processed version
      personalizationContext.basePrompt = processedPrompt;
    }

    // 2. Call the AI Pipeline via OpenAI
    const systemPrompt = `You are Aura, an elite Executive AI Assistant writing on behalf of the user. 
Your goal is to write a highly personalized, professional email based on the Base Prompt and the Recipient's Profile Context.
The email should sound human, warm, but incredibly sharp. Adopt the requested Tone.
Output exactly as a JSON object with 'subject' and 'body' string properties. Do not wrap in markdown or backticks.`;

    const userPrompt = `
Base Prompt:
${personalizationContext.basePrompt || personalizationContext.campaignGoal}

Recipient Profile Context:
- Name: ${personalizationContext.recipientName}
- Company: ${personalizationContext.company}
- Job Title: ${personalizationContext.jobTitle}
- Department: ${personalizationContext.department}
- Previous Notes: ${personalizationContext.notes}
- AI Summary: ${personalizationContext.aiSummary}
- Desired Tone: ${personalizationContext.preferredTone}

CRITICAL INSTRUCTION 1: You MUST replace any placeholders like [Student's Name], [Name], or instructions like (Check individual from their company name as their track) with the actual corresponding data from the Recipient Profile Context. Do NOT output the raw brackets or instructions in the final email.
CRITICAL INSTRUCTION 2: If the Base Prompt includes a signature or sign-off at the end (e.g. "Best, [Name] [Title]"), use their EXACT signature. Do not change it. If there is no signature in the prompt, sign off exactly as: ${personalizationContext.senderName}

Generate the 'subject' and 'body'.`;

    let subject = `Update for ${personalizationContext.company}`;
    let body = `Hi ${personalizationContext.recipientName},\n\nWe wanted to reach out to you.\n\nBest,\nAura`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      if (parsed.subject) subject = parsed.subject;
      if (parsed.body) body = parsed.body;
    } catch (e) {
      console.error("Failed to generate AI email:", e);
      // Fallback to basic template if API fails
      body = `Hi ${personalizationContext.recipientName},\n\n${personalizationContext.basePrompt}\n\nBest,`;
    }

    // 3. Save the deterministically generated draft and the context used
    return prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        personalizedSubject: subject,
        personalizedBody: body,
        personalizationContext: JSON.stringify(personalizationContext),
        approvalStatus: CampaignRecipientStatus.GENERATED,
        generatedAt: new Date()
      }
    });
  }

  static async generateAllForCampaign(campaignId: string, userId: string, useAi: boolean = true, regenerate: boolean = false) {
    // If regenerating, reset all generated/failed recipients back to PENDING
    if (regenerate) {
      await prisma.campaignRecipient.updateMany({
        where: { 
          campaignId,
          approvalStatus: { in: [CampaignRecipientStatus.GENERATED, CampaignRecipientStatus.FAILED] }
        },
        data: { approvalStatus: CampaignRecipientStatus.PENDING }
      });
    }

    // Marks campaign as GENERATING
    await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: { status: CampaignStatus.GENERATING }
    });

    // 1. Fetch pending recipients
    const pendingRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, approvalStatus: CampaignRecipientStatus.PENDING },
      select: { id: true }
    });
    
    // 1.5 Fetch User for signature
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const senderName = user?.name || "User";

    // 1.7 If Standard Mode (!useAi), generate ONE polished master template
    let masterSubject = "Campaign Update";
    let masterBody = "No content provided.";
    if (!useAi) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { template: true }
      });
      const basePrompt = campaign?.template?.basePrompt || "";
      masterSubject = campaign?.title || masterSubject;
      masterBody = basePrompt;

      try {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { 
              role: "system", 
              content: `You are Aura, an elite AI assistant. Write a polished, highly professional mass email based on the User's draft. 
                        Output exactly as a JSON object with 'subject' and 'body' string properties. 
                        Do not wrap in markdown or backticks. 
                        CRITICAL INSTRUCTIONS:
                        1. Use '[Name]' as the placeholder for the recipient's name (e.g. "Hi [Name],").
                        2. If the User's draft includes a signature or sign-off at the end, preserve it EXACTLY as written. If not, sign off as: ${senderName}` 
            },
            { role: "user", content: `Draft/Goal: ${basePrompt || campaign?.description || ""}` }
          ]
        });

        const parsed = JSON.parse(response.choices[0].message.content || "{}");
        if (parsed.subject) masterSubject = parsed.subject;
        if (parsed.body) masterBody = parsed.body;
      } catch (e) {
        console.error("Master AI Template generation failed:", e);
      }
    }

    // 2. Process in sequence (or parallel batches)
    for (const recipient of pendingRecipients) {
      try {
        if (useAi) {
          await CampaignPersonalizationService.generateForRecipient(recipient.id, userId, senderName);
        } else {
          // AI Master Template mode
          const rec = await prisma.campaignRecipient.findUnique({
            where: { id: recipient.id },
            include: { contact: { include: { organization: true } } }
          });
          
          const company = rec?.contact.organization?.name || rec?.contact.company || "";
          
          // Replace placeholders with actual contact data
          let finalBody = masterBody
            .replace(/\[Name\]|\[Student's Name\]|\[Student Name\]/gi, rec?.contact.name || "there")
            .replace(/\[Company\]|\[Track\]|\[Company Name\]/gi, company)
            .replace(/\[Job Title\]|\[Title\]/gi, rec?.contact.jobTitle || "")
            .replace(/\[Department\]/gi, rec?.contact.department || "");
          
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              personalizedSubject: masterSubject,
              personalizedBody: finalBody,
              approvalStatus: CampaignRecipientStatus.GENERATED,
              generatedAt: new Date()
            }
          });
        }
      } catch (err) {
        console.error(`Failed to generate for recipient ${recipient.id}:`, err);
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { 
            approvalStatus: CampaignRecipientStatus.FAILED,
            failedReason: err instanceof Error ? err.message : "Unknown AI generation error"
          }
        });
      }
    }

    // 3. Mark campaign as READY
    await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: { status: CampaignStatus.READY }
    });
  }
}
