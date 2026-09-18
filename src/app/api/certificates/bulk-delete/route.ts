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

    const { certificateIds } = await request.json();
    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      return NextResponse.json({ error: 'No certificate IDs provided' }, { status: 400 });
    }

    const result = await CertificateService.deleteBulkCertificates(session.user.id, certificateIds);
    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to bulk delete certificates' }, { status: 400 });
  }
}
