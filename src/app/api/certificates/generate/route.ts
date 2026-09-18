import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CertificateService } from '@/services/certificates/certificate.service';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateId,
      contactIds,
      groupIds,
      audienceId,
      title,
      description,
      issueDate,
      expiryDate,
      issuerName,
      issuerTitle,
    } = body;

    if (!templateId || !title) {
      return NextResponse.json(
        { error: 'Missing required parameters (templateId and title are required)' },
        { status: 400 }
      );
    }

    if (
      (!contactIds || contactIds.length === 0) &&
      (!groupIds || groupIds.length === 0) &&
      !audienceId
    ) {
      return NextResponse.json(
        { error: 'At least one contact, group, or audience recipient must be selected' },
        { status: 400 }
      );
    }

    const result = await CertificateService.generateBatchCertificates(session.user.id, {
      templateId,
      contactIds,
      groupIds,
      audienceId,
      title,
      description,
      issueDate,
      expiryDate,
      issuerName,
      issuerTitle,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error generating certificates batch:', error);
    return NextResponse.json({ error: error.message || 'Batch generation failed' }, { status: 400 });
  }
}
