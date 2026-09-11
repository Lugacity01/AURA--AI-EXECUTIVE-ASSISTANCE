import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createAICompletion } from "@/lib/openai-client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const reqBody = await request.json();
    const { additionalInstructions, followUpType } = reqBody;

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

    const getTypeDirective = (type: string) => {
      switch (type?.toUpperCase()) {
        case "REMINDER":
          return "Write a concise, polite, and effective reminder email urging the recipient to review and respond to the previous email sent below.";
        case "CUSTOM":
          return "Write a tailored follow-up email adhering strictly to the user's custom instructions provided below.";
        case "FOLLOW_UP":
        default:
          return "Write a warm, professional follow-up email providing value, checking in on the previous conversation, and offering next steps.";
      }
    };

    const typeDirective = getTypeDirective(followUpType);

    const systemPrompt = `You are Aura, an elite Executive AI Assistant.
Your goal is to write a highly professional follow-up email based on the previous interaction and requested follow-up type (${followUpType}).
Output exactly as a JSON object with 'subject' and 'body' string properties. Do not wrap in markdown or backticks.
IMPORTANT: Use '[Name]' as the placeholder for the recipient's name (e.g. "Hi [Name],").
CLOSING SIGN-OFF REQUIREMENT:
Sign off at the end of the email exactly as:
Azeez Mumeenat
Program Manager`;

    const userPrompt = `
Follow-up Type Goal (${followUpType}):
${typeDirective}

${additionalInstructions ? `Additional User Instructions:\n${additionalInstructions}\n` : ""}
Original Campaign Goal:
${originalCampaign.description || ""}

Original Email Sent:
Subject: ${originalSubject}
Body:
${originalBody}
`;

    const response = await createAICompletion({
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    let generatedBody = parsed.body || "";

    // Clean old sender names and format closing signature
    generatedBody = generatedBody.replace(/Adesina\s+Yinka\s+Abeeb|Yinka\s+Abeeb\s+Adesina|Abeeb\s+Adesina/gi, "Azeez Mumeenat");
    if (generatedBody.includes("Azeez Mumeenat") && !generatedBody.includes("Azeez Mumeenat\nProgram Manager") && !generatedBody.includes("Azeez Mumeenat\r\nProgram Manager")) {
      generatedBody = generatedBody.replace(/Azeez\s+Mumeenat(?![\s\S]*Azeez\s+Mumeenat)/i, "Azeez Mumeenat\nProgram Manager");
    } else if (!generatedBody.toLowerCase().includes("azeez mumeenat")) {
      generatedBody = `${generatedBody.trim()}\n\nWarm regards,\n\nAzeez Mumeenat\nProgram Manager`;
    }
    
    return NextResponse.json({ 
      subject: parsed.subject || `Re: ${originalSubject}`, 
      body: generatedBody 
    });
  } catch (error: any) {
    console.error("Failed to generate follow-up preview:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
