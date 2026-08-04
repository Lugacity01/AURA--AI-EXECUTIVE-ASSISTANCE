import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-or') ? 'https://openrouter.ai/api/v1' : undefined
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { additionalInstructions, followUpType } = body;

    const originalCampaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        recipients: { take: 1, include: { contact: { include: { organization: true } } } }
      }
    });

    if (!originalCampaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sampleRecipient = originalCampaign.recipients[0];
    const originalSubject = sampleRecipient?.personalizedSubject || "N/A";
    const originalBody = sampleRecipient?.personalizedBody || "N/A";
    const senderName = session.user.name || "User";

    const systemPrompt = `You are Aura, an elite Executive AI Assistant.
Your goal is to write a highly professional follow-up email based on the previous interaction.
Output exactly as a JSON object with 'subject' and 'body' string properties. Do not wrap in markdown or backticks.
IMPORTANT: Use '[Name]' as the placeholder for the recipient's name (e.g. "Hi [Name],").
Preserve exact signatures if requested, otherwise sign off as: ${senderName}`;

    const userPrompt = `
Follow-up Instructions:
${additionalInstructions || `Write a standard ${followUpType} follow up.`}

Original Campaign Goal:
${originalCampaign.description || ""}

Original Email Sent:
Subject: ${originalSubject}
Body:
${originalBody}
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
    
    return NextResponse.json({ 
      subject: parsed.subject || `Re: ${originalSubject}`, 
      body: parsed.body 
    });
  } catch (error: any) {
    console.error("Failed to generate follow-up preview:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
