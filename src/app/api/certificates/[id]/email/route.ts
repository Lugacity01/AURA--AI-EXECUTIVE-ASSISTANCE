import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CertificateService } from '@/services/certificates/certificate.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { subject, message } = body;

    const result = await CertificateService.emailCertificate(
      session.user.id,
      id,
      subject,
      message
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error emailing certificate:', error);
    return NextResponse.json({ error: error.message || 'Failed to email certificate' }, { status: 400 });
  }
}
