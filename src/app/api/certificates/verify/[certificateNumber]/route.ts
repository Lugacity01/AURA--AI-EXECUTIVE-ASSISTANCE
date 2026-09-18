import { NextResponse } from 'next/server';
import { CertificateVerificationService } from '@/services/certificates/certificate-verification.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  try {
    const { certificateNumber } = await params;
    if (!certificateNumber) {
      return NextResponse.json({ error: 'Certificate number is required' }, { status: 400 });
    }

    const verification = await CertificateVerificationService.verifyCertificate(certificateNumber);
    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    console.error('Public certificate verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
