import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createAICompletion } from '@/lib/openai-client';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt string is required' }, { status: 400 });
    }

    const systemPrompt = `You are a professional certificate copywriter. Given a user's event, training, or achievement description, generate formal, elegant certificate wording.
Return JSON format with exact keys:
{
  "title": "Short formal title (e.g., Certificate of Completion / Certificate of Appreciation / Certificate of Excellence)",
  "description": "Formal, elegant 1-2 sentence certificate citation body wording (e.g. 'In recognition of successful completion of...')",
  "issuerTitle": "Suggested formal title for issuer (e.g. Program Director / Executive Director)"
}`;

    const completion = await createAICompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate certificate wording for: "${prompt}"` },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      title: parsed.title || 'Certificate of Achievement',
      description: parsed.description || prompt,
      issuerTitle: parsed.issuerTitle || 'Authorized Signatory',
    });
  } catch (error: any) {
    console.error('Error generating AI certificate wording:', error);
    return NextResponse.json({ error: error.message || 'AI Wording Generation failed' }, { status: 500 });
  }
}
