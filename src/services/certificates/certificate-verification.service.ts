import { prisma } from '@/lib/prisma';
import { CertificateSnapshot } from './types';

export interface PublicVerificationResult {
  found: boolean;
  certificateNumber?: string;
  status?: 'ACTIVE' | 'REVOKED';
  recipientName?: string;
  recipientCompany?: string | null;
  title?: string;
  description?: string | null;
  issueDate?: Date;
  expiryDate?: Date | null;
  issuerName?: string | null;
  issuerTitle?: string | null;
}

export class CertificateVerificationService {
  /**
   * Public unauthenticated verification lookup for a certificate number
   */
  static async verifyCertificate(certificateNumber: string): Promise<PublicVerificationResult> {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber: certificateNumber.trim() },
    });

    if (!cert) {
      return { found: false };
    }

    let snapshot: Partial<CertificateSnapshot> = {};
    try {
      snapshot = JSON.parse(cert.snapshotData);
    } catch (e) {
      // Fallback if parsing fails
    }

    return {
      found: true,
      certificateNumber: cert.certificateNumber,
      status: cert.status as 'ACTIVE' | 'REVOKED',
      recipientName: snapshot.contactName || 'Recipient',
      recipientCompany: snapshot.contactCompany || null,
      title: cert.title,
      description: cert.description || null,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate || null,
      issuerName: cert.issuerName || null,
      issuerTitle: cert.issuerTitle || null,
    };
  }
}
