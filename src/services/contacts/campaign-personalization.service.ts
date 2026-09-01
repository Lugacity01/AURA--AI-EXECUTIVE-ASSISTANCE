import { prisma } from "../../lib/prisma";
import { CampaignRecipientStatus, CampaignStatus } from "@prisma/client";
import OpenAI from "openai";
import { replaceContactPlaceholders } from "@/lib/font-sanitizer";

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

    if (!recipient) throw new Error("Recipient not found");

    const contact = recipient.contact;
    const campaign = recipient.campaign;
    const template = campaign.template;

    const personalizationContext = {
      recipientName: contact.name,
      recipientEmail: contact.email,
      company: contact.company || contact.organization?.name || (contact.notes ? contact.notes.split('\n')[0] : ""),
      jobTitle: contact.jobTitle || "",
      department: contact.department || "",
      notes: contact.notes || "",
      aiSummary: contact.aiSummary || "",
      preferredTone: contact.preferredTone || "Professional",
      recentActivities: contact.activities.map(a => `${a.type}: ${a.title}`).join("; "),
      tags: contact.tags.map(t => t.tag.name).join(", "),
      campaignGoal: campaign.description || template?.basePrompt || "Reach out to discuss collaboration",
      basePrompt: template?.basePrompt || campaign.description || "",
      senderName
    };

    // 1.5 Pre-process the base prompt to substitute obvious template variables
    // This guarantees variables are injected even if the AI is stubborn
    let processedPrompt = personalizationContext.basePrompt || personalizationContext.campaignGoal;
    if (processedPrompt) {
      processedPrompt = replaceContactPlaceholders(processedPrompt, {
        name: personalizationContext.recipientName,
        email: personalizationContext.recipientEmail || "",
        company: personalizationContext.company,
        jobTitle: personalizationContext.jobTitle,
        department: personalizationContext.department
      });
      
      // Update the context so the AI gets the processed version
      personalizationContext.basePrompt = processedPrompt;
    }

    // 2. Call the AI Pipeline via OpenAI
    const isWhatsApp = campaign.channel === "WHATSAPP";
    
const systemPrompt = `You are Aura, a world-class Executive AI Copywriter and Communication Specialist.
Your task is to take the user's Base Prompt / Instructions and transform it into a COMPLETE, ARTICULATE, HIGHLY PROFESSIONAL, AND PERSONALIZED EMAIL.

CRITICAL CREATIVE MANDATES:
1. NEVER ECHO OR PARROT SHORT PROMPTS VERBATIM: Even if the user enters a brief draft or instruction, you MUST expand, polish, and elevate it into a well-structured, engaging, multi-sentence message with proper context and professional flow.
2. PERSONALIZATION INTEGRATION: Intelligently incorporate the recipient's Profile Context (Name, Track/Company, Role) naturally into the body so it feels written specifically for them.
3. CLEAR & IMPACTFUL STRUCTURE: Include a warm greeting, an engaging opening, clear key details/reminders, and an encouraging closing sign-off.
4. ${isWhatsApp ? "This is a WhatsApp message. Keep paragraphs brief, punchy, conversational, and use emojis appropriately. Do NOT output a subject line." : "Create a compelling, clear subject line that summarizes the topic."}

Output format: Return ONLY a JSON object with ${isWhatsApp ? "a 'body' property" : "'subject' and 'body' properties"}. Do not use markdown backticks or extra text outside JSON.`;

    const userPrompt = `
Base Prompt / User Instructions:
"""
${personalizationContext.basePrompt || personalizationContext.campaignGoal}
"""

Recipient Profile Context:
- Recipient Name: ${personalizationContext.recipientName}
- Company / Track / Organization: ${personalizationContext.company}
- Job Title / Role: ${personalizationContext.jobTitle}
- Department: ${personalizationContext.department}
- Additional Context / Notes: ${personalizationContext.notes || "None"}
- Desired Tone: ${personalizationContext.preferredTone || "Professional & Warm"}
- Sender Sign-off Name: ${personalizationContext.senderName}

INSTRUCTIONS:
1. Rewrite and expand the Base Prompt into a beautifully written, articulate message tailored for ${personalizationContext.recipientName}.
2. Replace any raw placeholders like [Name], [Track], [Company] with real recipient data (${personalizationContext.recipientName}, ${personalizationContext.company}).
3. Ensure the tone is ${personalizationContext.preferredTone || "Professional & Warm"}.

Generate the JSON object:`;    let subject = isWhatsApp ? "" : `Update for ${personalizationContext.company}`;
    let body = `Hi ${personalizationContext.recipientName},\n\nWe wanted to reach out to you.\n\nBest,\nAura`;

    const modelsToTry = Array.from(new Set([
      process.env.OPENAI_CHAT_MODEL || "openai/gpt-4o-mini",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.3-70b-instruct",
      "gpt-4o"
    ]));

    for (const model of modelsToTry) {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        });

        let rawContent = response.choices[0]?.message?.content || "";
        if (!rawContent) continue;

        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.subject || parsed.body) {
              if (parsed.subject) subject = parsed.subject;
              if (parsed.body) body = parsed.body;
              break;
            }
          }
        } catch {
          // Fallback text parser if model returns plain text
          const subjectMatch = rawContent.match(/(?:Subject|Title):\s*(.+)/i);
          if (subjectMatch) subject = subjectMatch[1].trim();
          
          const bodyText = rawContent.replace(/(?:Subject|Title):\s*.+/i, "").trim();
          if (bodyText) {
            body = bodyText;
            break;
          }
        }
      } catch (e: any) {
        console.warn(`AI model ${model} failed, trying fallback:`, e.message || e);
      }
    }

    // 2.5 Generate personalized PDF Content if PDF Attachment is enabled
    let personalizedPdfContent: string | null = null;
    if (Boolean(campaign.pdfEnabled)) {
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

  /**
   * Bulk generates drafts for all pending recipients in a campaign.
   */
  static async generateAllForCampaign(campaignId: string, userId: string, useAi: boolean = true, regenerate: boolean = false) {
    // ALWAYS reset all unsent recipients back to PENDING so AI always generates/regenerates fresh drafts
    await prisma.campaignRecipient.updateMany({
      where: { 
        campaignId,
        sendStatus: { not: 'SENT' } // Reset anything that hasn't been sent yet
      },
      data: { approvalStatus: CampaignRecipientStatus.PENDING }
    });

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
      const basePrompt = campaign?.template?.basePrompt || campaign?.description || "";
      masterSubject = isWhatsApp ? "" : (campaign?.title || masterSubject);
      masterBody = basePrompt;

      const masterModelsToTry = Array.from(new Set([
        process.env.OPENAI_CHAT_MODEL || "openai/gpt-4o-mini",
        "openai/gpt-4o-mini",
        "meta-llama/llama-3.3-70b-instruct",
        "gpt-4o"
      ]));

      for (const model of masterModelsToTry) {
        try {
          const response = await openai.chat.completions.create({
            model,
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

          let rawMaster = response.choices[0]?.message?.content || "";
          if (!rawMaster) continue;

          const jsonMatch = rawMaster.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            rawMaster = jsonMatch[0];
          }

          const parsed = JSON.parse(rawMaster);
          if (parsed.subject) masterSubject = parsed.subject;
          if (parsed.body) masterBody = parsed.body;
          if (parsed.subject || parsed.body) break;
        } catch (e: any) {
          console.warn(`Master AI template model ${model} failed, trying fallback:`, e.message || e);
        }
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
          
          // Replace placeholders with actual contact data
          let finalBody = replaceContactPlaceholders(masterBody, rec?.contact);
          
          // Generate PDF content for Master Template mode if PDF is enabled
          let personalizedPdfContent: string | null = null;
          if (Boolean(campaign.pdfEnabled)) {
            if (campaign.pdfContentSource === "EMAIL_BODY") {
              personalizedPdfContent = finalBody;
            } else {
              const rawPdfTemplate = campaign.pdfTemplate || campaign.pdfTitle || masterBody;
              personalizedPdfContent = replaceContactPlaceholders(rawPdfTemplate, rec?.contact);
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
