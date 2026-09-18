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
    const revoked = await CertificateService.revokeCertificate(session.user.id, id);

    return NextResponse.json({ success: true, certificate: revoked });
  } catch (error: any) {
    console.error('Error revoking certificate:', error);
    return NextResponse.json({ error: error.message || 'Failed to revoke certificate' }, { status: 400 });
  }
}
