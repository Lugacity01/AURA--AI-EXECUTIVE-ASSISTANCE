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
   * Post-processes generated email bodies to strictly ensure opening greetings address the recipient
   * and NEVER accidentally address the sender.
   */
  private static sanitizeSalutation(body: string, recipientName: string, senderName: string, isMasterTemplate: boolean = false): string {
    if (!body) return body;

    const targetName = isMasterTemplate ? "[Name]" : (recipientName?.trim() || "there");

    // Matches standard opening greetings at the very start of the body:
    // e.g., "Dear Azeez Mumeenat," or "Hi Azeez Mumeenat," or "Hello Azeez Mumeenat,"
    const salutationRegex = /^((?:Dear|Hi|Hello|Greetings|Good\s+(?:day|evening|morning)|Hey)\s+)([^\n,\!\:]+)([,\!\:]?)/i;
    const match = body.match(salutationRegex);

    if (match) {
      const prefix = match[1]; // e.g. "Dear "
      const currentGreetingName = match[2].trim(); // e.g. "Azeez Mumeenat"
      const punctuation = match[3] || ",";

      const senderLower = (senderName || "").trim().toLowerCase();
      const currentLower = currentGreetingName.toLowerCase();

      // 1. If opening greeting addresses the sender's name (e.g. "Dear Azeez Mumeenat,")
      if (senderLower && (currentLower === senderLower || currentLower.includes(senderLower) || senderLower.includes(currentLower))) {
        return body.replace(salutationRegex, `${prefix}${targetName}${punctuation}`);
      }

      // 2. In Master Template mode, if greeting uses ANY specific name instead of [Name]
      if (isMasterTemplate && currentGreetingName !== "[Name]") {
        return body.replace(salutationRegex, `${prefix}[Name]${punctuation}`);
      }

      // 3. In Recipient mode, if greeting uses [Name] or raw placeholder, replace with contact name
      if (!isMasterTemplate && (currentGreetingName.startsWith("[") || currentLower === "there")) {
        return body.replace(salutationRegex, `${prefix}${targetName}${punctuation}`);
      }
    } else {
      // If there's no recognizable greeting line at the top, prepend one
      return `Dear ${targetName},\n\n${body}`;
    }

    return body;
  }

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

    // 1.8 Meeting Broadcast Details
    let meetingContext = "";
    if (campaign.campaignType === "MEETING") {
      const formattedDate = campaign.eventDate
        ? new Date(campaign.eventDate).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
        : undefined;
      meetingContext = `
MEETING / CLASS BROADCAST DETAILS:
- Scheduled Meeting Time: ${formattedDate || "As specified in prompt"}
- Duration: ${campaign.eventDuration ? `${campaign.eventDuration} minutes` : "30-60 minutes"}
- Instructions: Clearly announce the class/meeting date and time. Remind the recipient that a Google Meet link will be automatically attached to this broadcast.`;
    }

    // 2. Call the AI Pipeline via OpenAI
    const isWhatsApp = campaign.channel === "WHATSAPP";
    
    const systemPrompt = `You are Aura, a world-class Executive AI Copywriter and Communication Specialist.
Your task is to take the user's Base Prompt / Instructions and transform it into a COMPLETE, ARTICULATE, HIGHLY PROFESSIONAL, AND PERSONALIZED EMAIL.

CRITICAL CREATIVE MANDATES:
1. NEVER ECHO OR PARROT SHORT PROMPTS VERBATIM: Even if the user enters a brief draft or instruction, you MUST expand, polish, and elevate it into a well-structured, engaging, multi-sentence message with proper context and professional flow.
2. PERSONALIZATION INTEGRATION: Intelligently incorporate the recipient's Profile Context naturally into the body so it feels written specifically for them.
3. RECIPIENT SALUTATION vs SENDER SIGNATURE:
   - The opening greeting MUST address the RECIPIENT (${personalizationContext.recipientName || 'there'}). Example: "Dear ${personalizationContext.recipientName || 'there'},".
   - NEVER put the Sender's name (${personalizationContext.senderName}) in the opening greeting! The Sender (${personalizationContext.senderName}) MUST ONLY appear in the closing sign-off at the end.
4. ${campaign.campaignType === "MEETING" ? "MEETING BROADCAST: State the meeting/class topic, scheduled time clearly, and remind attendees to join." : ""}
5. ${isWhatsApp ? "This is a WhatsApp message. Keep paragraphs brief, punchy, conversational, and use emojis appropriately. Do NOT output a subject line." : "Create a compelling, clear subject line that summarizes the topic."}

Output format: Return ONLY a JSON object with ${isWhatsApp ? "a 'body' property" : "'subject' and 'body' properties"}. Do not use markdown backticks or extra text outside JSON.`;

    const userPrompt = `
Base Prompt / User Instructions:
"""
${personalizationContext.basePrompt || personalizationContext.campaignGoal}
"""
${meetingContext}

Recipient Profile Context:
- Recipient Name: ${personalizationContext.recipientName}
- Company / Track / Organization: ${personalizationContext.company}
- Job Title / Role: ${personalizationContext.jobTitle}
- Department: ${personalizationContext.department}
- Additional Context / Notes: ${personalizationContext.notes || "None"}
- Desired Tone: ${personalizationContext.preferredTone || "Professional & Warm"}
- Sender Sign-off Name: ${personalizationContext.senderName}

INSTRUCTIONS:
1. Rewrite and expand the Base Prompt into a beautifully written, articulate message. Start with "Dear ${personalizationContext.recipientName || 'there'}," (or "Hi ${personalizationContext.recipientName || 'there'},").
2. DO NOT address ${personalizationContext.senderName} in the greeting. Address ${personalizationContext.recipientName || 'there'}.
3. Replace any raw placeholders like [Name], [Track], [Company] with real recipient data (${personalizationContext.recipientName}, ${personalizationContext.company}).
4. Ensure the tone is ${personalizationContext.preferredTone || "Professional & Warm"}.

Generate the JSON object:`;

    let subject = isWhatsApp ? "" : `Update for ${personalizationContext.company}`;
    let body = `Hi ${personalizationContext.recipientName},\n\nWe wanted to reach out to you.\n\nBest,\n${personalizationContext.senderName}`;

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

    // Post-process body to guarantee greeting addresses recipient and NOT sender
    body = CampaignPersonalizationService.sanitizeSalutation(body, personalizationContext.recipientName, senderName, false);

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

        let meetingContext = "";
        if (campaign?.campaignType === "MEETING") {
          const formattedDate = campaign.eventDate
            ? new Date(campaign.eventDate).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
            : undefined;
          meetingContext = `\n\nMEETING DETAILS:\n- Scheduled Time: ${formattedDate || "Time specified in draft"}\n- Duration: ${campaign.eventDuration ? `${campaign.eventDuration} minutes` : "30-60 minutes"}`;
        }

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
                  content: `You are Aura, an elite AI assistant. Write a polished, highly professional mass message template based on the User's draft. 
                            Output exactly as a JSON object with ${isWhatsApp ? "only a 'body'" : "'subject' and 'body'"} string properties. 
                            Do not wrap in markdown or backticks. 
                            CRITICAL: Do NOT include labels like "Subject:" or "Body:" inside the strings themselves. The strings should contain ONLY the actual content.
                            ${isWhatsApp ? "This is a WhatsApp broadcast. Keep paragraphs short and conversational. Include emojis where natural. No subject line." : ""}
                            CRITICAL SALUTATION & PLACEHOLDER MANDATES:
                            1. The opening greeting MUST start with 'Dear [Name],' or 'Hi [Name],' using '[Name]' as the recipient placeholder.
                            2. If the User's draft has an existing greeting addressing any specific name (such as 'Dear Azeez Mumeenat,' or 'Dear Student,'), REPLACE IT WITH 'Dear [Name],'.
                            3. SENDER VS RECIPIENT: The sender is '${senderName}'. NEVER address '${senderName}' in the opening greeting! '${senderName}' MUST ONLY appear in the closing signature at the very end.
                            ${campaign?.campaignType === "MEETING" ? "4. MEETING BROADCAST: State the class/meeting topic and scheduled time clearly in the template body." : ""}
                            5. If the User's draft includes a signature or sign-off at the end, preserve it. If not, sign off as: ${senderName}` 
                },
                { role: "user", content: `Draft/Goal: ${basePrompt || campaign?.description || ""}${meetingContext}` }
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

        // Post-process master template to ensure opening greeting uses [Name] and NOT senderName
        masterBody = CampaignPersonalizationService.sanitizeSalutation(masterBody, "there", senderName, true);
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
            finalBody = CampaignPersonalizationService.sanitizeSalutation(finalBody, rec?.contact?.name || "there", senderName, false);
            
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
