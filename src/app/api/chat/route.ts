import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
  });

  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "Missing prompt query" }, { status: 400 });
    }

    // Query active context emails from prisma
    const emails = await prisma.email.findMany({
      where: { userId: session.user.id },
      take: 15,
      orderBy: { receivedAt: "desc" },
      include: { draft: true }
    });

    // Format emails database context for system prompt injection
    const contextString = emails.map(e => `
ID: ${e.id}
From: ${e.from}
Subject: ${e.subject}
Body Snippet: ${e.body.slice(0, 300)}
Status: ${e.status}
AI Draft Response: ${e.draft?.draftContent || "None generated"}
Risk Level: ${e.draft?.riskLevel || "None"}
Confidence Score: ${e.draft?.confidence || "N/A"}
Risk Reason: ${e.draft?.riskAnalysis || "N/A"}
---`).join("\n");

    const systemPrompt = `You are Aura, a premium context-aware AI Executive Assistant.
You have access to Yinka's workspace database.
Below is the live email context retrieved from the database (last 15 messages):
${contextString}

Answer user queries accurately by analyzing the database context provided above.
If the query asks to summarize emails, write drafts, explain risk factors, or retrieve info, formulate your answer directly based on this data.
Keep your response concise, professional, and clear. Use markdown bolding and bullet lists for readability.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "google/gemma-4-26b-a4b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    // Conditionally attach metadata widgets if user asks for summaries
    const isSummary = text.toLowerCase().includes("summarize") || text.toLowerCase().includes("summary");
    const meta: any = {};
    if (isSummary) {
      meta.type = "summary";
      meta.saved = "2.5h";
      const needsReviewCount = emails.filter(e => e.status === "NEEDS_APPROVAL").length;
      meta.approvals = needsReviewCount;
    }

    return NextResponse.json({ reply, meta });
  } catch (error: any) {
    console.error("OpenAI/Gemini Chat API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute chat query" }, { status: 500 });
  }
}
