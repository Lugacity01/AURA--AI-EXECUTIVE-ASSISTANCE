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
    const { certificateIds } = body;

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return NextResponse.json({ error: 'No certificate IDs provided' }, { status: 400 });
    }

    const zipBuffer = await CertificateService.createBulkZip(session.user.id, certificateIds);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="aura_certificates.zip"',
      },
    });
  } catch (error: any) {
    console.error('Error creating bulk ZIP download:', error);
    return NextResponse.json({ error: error.message || 'Bulk download failed' }, { status: 500 });
  }
}
