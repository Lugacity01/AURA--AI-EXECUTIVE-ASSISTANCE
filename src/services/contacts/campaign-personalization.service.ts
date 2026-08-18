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
    const isWhatsApp = campaign.channel === "WHATSAPP";
    
const systemPrompt = `You are Aura, an elite Executive AI Assistant writing on behalf of the user. 
Your goal is to WRITE A COMPLETE, HIGHLY PERSONALIZED MESSAGE based on the Base Prompt and the Recipient's Profile Context.
You MUST adopt the requested Tone. Do NOT just copy the Base Prompt verbatim—you MUST rewrite, polish, and adapt it to perfectly match the requested Tone.
${isWhatsApp ? "This message is for WhatsApp. Keep it conversational, short, and use emojis appropriately. Do NOT output a subject line." : ""}
Output exactly as a JSON object with ${isWhatsApp ? "only a 'body'" : "'subject' and 'body'"} string properties. Do not wrap in markdown or backticks.
CRITICAL: Do NOT include labels like "Subject:" or "Body:" inside the strings themselves. The strings should contain ONLY the actual content.`;

    const userPrompt = `
Base Prompt:
${personalizationContext.basePrompt || personalizationContext.campaignGoal}

Recipient Profile Context:
- Name: ${personalizationContext.recipientName}
- Company / Track: ${personalizationContext.company}
- Job Title: ${personalizationContext.jobTitle}
- Department: ${personalizationContext.department}
- Previous Notes: ${personalizationContext.notes}
- AI Summary: ${personalizationContext.aiSummary}
- Desired Tone: ${personalizationContext.preferredTone}

CRITICAL INSTRUCTION 1: You MUST replace any placeholders like [Student's Name], [Name], or instructions like (Check individual from their company name as their track) with the actual corresponding data from the Recipient Profile Context. Do NOT output the raw brackets or instructions in the final message.
CRITICAL INSTRUCTION 2: If the Base Prompt leaves a blank space for a value (e.g., "Track: ", "Company: "), you MUST intelligently fill it in using the Recipient Profile Context. Never leave it blank!
CRITICAL INSTRUCTION 3: Do NOT add a double signature. If the Base Prompt already includes a sign-off or signature at the bottom (e.g. "Best wishes, Company Name"), preserve it exactly and DO NOT append the sender's name. Only append ${personalizationContext.senderName} if there is absolutely no sign-off in the draft.

Generate the JSON.`;

    let subject = isWhatsApp ? "" : `Update for ${personalizationContext.company}`;
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

      let rawContent = response.choices[0].message.content || "{}";
      rawContent = rawContent.trim().replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(rawContent);
      if (parsed.subject) subject = parsed.subject;
      if (parsed.body) body = parsed.body;
    } catch (e) {
      console.error("Failed to generate AI email:", e);
      // Fallback to basic template if API fails
      body = `Hi ${personalizationContext.recipientName},\n\n${personalizationContext.basePrompt}\n\nBest,`;
    }

    // 2.5 Generate personalized PDF Content if PDF Attachment is enabled
    let personalizedPdfContent: string | null = null;
    if (campaign.pdfEnabled || campaign.pdfTemplate || campaign.pdfTitle || campaign.pdfHeaderImage) {
      if (campaign.pdfContentSource === "EMAIL_BODY") {
        personalizedPdfContent = body;
      } else {
        const rawPdfTemplate = campaign.pdfTemplate || campaign.pdfTitle || body;
        personalizedPdfContent = rawPdfTemplate
          .replace(/\[Name\]|\[Student's Name\]|\[Student Name\]/gi, personalizationContext.recipientName)
          .replace(/\[Company\]|\[Track\]|\[Company Name\]/gi, personalizationContext.company)
          .replace(/\[Job Title\]|\[Title\]/gi, personalizationContext.jobTitle)
          .replace(/\[Department\]/gi, personalizationContext.department);
      }
    }

    // 3. Save the deterministically generated draft and the context used
    return prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        personalizedSubject: subject,
        personalizedBody: body,
        personalizedPdfContent: personalizedPdfContent,
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
          sendStatus: { not: 'SENT' }, // Reset anything that hasn't been sent yet
          // Only reset if they aren't already pending
          approvalStatus: { not: CampaignRecipientStatus.PENDING }
        },
        data: { approvalStatus: CampaignRecipientStatus.PENDING }
      });
    }

    // Marks campaign as GENERATING
    const campaign = await prisma.campaign.update({
      where: { id: campaignId, userId },
      data: { status: CampaignStatus.GENERATING },
      include: { template: true }
    });

    try {
      // 1. Fetch pending recipients
    const pendingRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, approvalStatus: CampaignRecipientStatus.PENDING },
      select: { id: true }
    });
    
    // 1.5 Fetch User for signature
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const senderName = user?.name || "User";

    // 1.7 If Standard Mode (!useAi), generate ONE polished master template
    const isWhatsApp = campaign?.channel === "WHATSAPP";
    let masterSubject = isWhatsApp ? "" : "Campaign Update";
    let masterBody = "No content provided.";
    if (!useAi) {
      const basePrompt = campaign?.template?.basePrompt || "";
      masterSubject = isWhatsApp ? "" : (campaign?.title || masterSubject);
      masterBody = basePrompt;

      try {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            { 
              role: "system", 
              content: `You are Aura, an elite AI assistant. Write a polished, highly professional mass message based on the User's draft. 
                        Output exactly as a JSON object with ${isWhatsApp ? "only a 'body'" : "'subject' and 'body'"} string properties. 
                        Do not wrap in markdown or backticks. 
                        CRITICAL: Do NOT include labels like "Subject:" or "Body:" inside the strings themselves. The strings should contain ONLY the actual content.
                        ${isWhatsApp ? "This is a WhatsApp broadcast. Keep paragraphs short and conversational. Include emojis where natural. No subject line." : ""}
                        CRITICAL INSTRUCTIONS:
                        1. Use '[Name]' as the placeholder for the recipient's name (e.g. "Hi [Name],").
                        2. If the User's draft includes a signature or sign-off at the end, preserve it EXACTLY as written. If not, sign off as: ${senderName}` 
            },
            { role: "user", content: `Draft/Goal: ${basePrompt || campaign?.description || ""}` }
          ]
        });

        let rawMaster = response.choices[0].message.content || "{}";
        rawMaster = rawMaster.trim().replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(rawMaster);
        if (parsed.subject) masterSubject = parsed.subject;
        if (parsed.body) masterBody = parsed.body;
      } catch (e) {
        console.error("Master AI Template generation failed:", e);
      }
    }

    // 2. Process in parallel
    await Promise.all(pendingRecipients.map(async (recipient) => {
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
          
          // Generate PDF content for Master Template mode if PDF is enabled
          let personalizedPdfContent: string | null = null;
          if (campaign.pdfEnabled || campaign.pdfTemplate || campaign.pdfTitle) {
            if (campaign.pdfContentSource === "EMAIL_BODY") {
              personalizedPdfContent = finalBody;
            } else {
              const rawPdfTemplate = campaign.pdfTemplate || campaign.pdfTitle || masterBody;
              personalizedPdfContent = rawPdfTemplate
                .replace(/\[Name\]|\[Student's Name\]|\[Student Name\]/gi, rec?.contact.name || "there")
                .replace(/\[Company\]|\[Track\]|\[Company Name\]/gi, company)
                .replace(/\[Job Title\]|\[Title\]/gi, rec?.contact.jobTitle || "")
                .replace(/\[Department\]/gi, rec?.contact.department || "");
            }
          }
          
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              personalizedSubject: masterSubject,
              personalizedBody: finalBody,
              personalizedPdfContent: personalizedPdfContent,
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
    }));

      // 3. Mark campaign as READY
      await prisma.campaign.update({
        where: { id: campaignId, userId },
        data: { status: CampaignStatus.READY }
      });
    } catch (fatalError) {
      console.error("Fatal error during campaign generation:", fatalError);
      
      // If we crashed completely, fallback to DRAFT so the user isn't stuck
      await prisma.campaign.update({
        where: { id: campaignId, userId },
        data: { status: CampaignStatus.DRAFT }
      });
    }
  }
}
