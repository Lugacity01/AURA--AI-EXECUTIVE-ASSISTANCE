import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';
import { TokenManager } from '../gmail/token-manager';
import { GmailClient } from '../gmail/gmail-client';
import { CertificateRendererService } from './certificate-renderer.service';
import { readStorageFile, saveGeneratedPdf, deleteStorageFile } from './certificate-storage.service';
import { BatchGenerationResult, CertificateSnapshot, FieldConfig } from './types';

export interface GenerateBatchInput {
  templateId: string;
  contactIds?: string[];
  groupIds?: string[];
  audienceId?: string;
  title: string;
  description?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  issuerName?: string;
  issuerTitle?: string;
}

export class CertificateService {
  /**
   * Generates a collision-safe certificate number e.g. AURA-CERT-2026-X8F92K with retry loop
   */
  static async generateUniqueCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 5; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const num = `AURA-CERT-${year}-${code}`;

      const existing = await prisma.certificate.findUnique({
        where: { certificateNumber: num },
        select: { id: true },
      });

      if (!existing) {
        return num;
      }
    }

    // Fallback if 5 attempts collided
    return `AURA-CERT-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Resolves contacts from individual IDs, Group IDs, or Audience ID
   */
  static async resolveRecipientContacts(
    userId: string,
    selection: { contactIds?: string[]; groupIds?: string[]; audienceId?: string }
  ) {
    const contactMap = new Map<string, any>();

    // 1. Individual Contact IDs
    if (selection.contactIds && selection.contactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: selection.contactIds },
          userId,
        },
      });
      for (const c of contacts) {
        contactMap.set(c.id, c);
      }
    }

    // 2. Group IDs
    if (selection.groupIds && selection.groupIds.length > 0) {
      const groupMembers = await prisma.contactGroupMember.findMany({
        where: {
          groupId: { in: selection.groupIds },
        },
        include: {
          contact: true,
        },
      });
      for (const gm of groupMembers) {
        if (gm.contact && gm.contact.userId === userId) {
          contactMap.set(gm.contact.id, gm.contact);
        }
      }
    }

    // 3. Audience ID
    if (selection.audienceId) {
      const audience = await prisma.audience.findFirst({
        where: { id: selection.audienceId, userId },
      });
      if (audience) {
        const allUserContacts = await prisma.contact.findMany({
          where: { userId },
        });
        for (const c of allUserContacts) {
          contactMap.set(c.id, c);
        }
      }
    }

    return Array.from(contactMap.values());
  }

  /**
   * Batch Certificate Generation Engine with isolated per-recipient error handling
   */
  static async generateBatchCertificates(
    userId: string,
    input: GenerateBatchInput
  ): Promise<BatchGenerationResult> {
    // 1. Fetch Template
    const template = await prisma.certificateTemplate.findFirst({
      where: { id: input.templateId, userId },
    });

    if (!template) {
      throw new Error('Certificate template not found or unauthorized');
    }

    const fields: FieldConfig[] = JSON.parse(template.fields);

    // 2. Fetch Background Image Buffer if present
    let backgroundBuffer: Buffer | null = null;
    if (template.backgroundStorageKey) {
      try {
        backgroundBuffer = await readStorageFile(template.backgroundStorageKey);
      } catch (bgErr) {
        console.error('Warning: Failed to load background file for certificate template:', bgErr);
      }
    }

    // 3. Resolve Contacts
    const contacts = await this.resolveRecipientContacts(userId, {
      contactIds: input.contactIds,
      groupIds: input.groupIds,
      audienceId: input.audienceId,
    });

    if (contacts.length === 0) {
      throw new Error('No valid recipients selected for certificate generation');
    }

    const result: BatchGenerationResult = {
      total: contacts.length,
      successful: 0,
      failed: 0,
      certificates: [],
      failures: [],
    };

    const parsedIssueDate = input.issueDate ? new Date(input.issueDate) : new Date();
    const parsedExpiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;

    // 4. Isolated recipient generation loop
    for (const contact of contacts) {
      try {
        const certNumber = await this.generateUniqueCertificateNumber();

        const certMeta = {
          title: input.title,
          description: input.description,
          issueDate: parsedIssueDate,
          expiryDate: parsedExpiryDate,
          issuerName: input.issuerName,
          issuerTitle: input.issuerTitle,
        };

        // Render PDF
        const pdfBuffer = await CertificateRendererService.renderCertificatePdf({
          canvasWidth: template.canvasWidth,
          canvasHeight: template.canvasHeight,
          backgroundBuffer,
          fields,
          contact,
          certMeta,
          certificateNumber: certNumber,
        });

        // Save PDF to Disk Storage
        const pdfStorageKey = await saveGeneratedPdf(pdfBuffer, certNumber);

        // Immutable Snapshot Data
        const snapshot: CertificateSnapshot = {
          contactId: contact.id,
          contactName: contact.name,
          contactEmail: contact.email,
          contactCompany: contact.company || undefined,
          contactPhone: contact.phone || undefined,
          contactJobTitle: contact.jobTitle || undefined,
          contactDepartment: contact.department || undefined,
          contactWebsite: contact.website || undefined,
          contactLinkedin: contact.linkedin || undefined,
          contactRelationshipType: contact.relationshipType || undefined,
          title: input.title,
          description: input.description || undefined,
          issueDate: parsedIssueDate.toISOString(),
          expiryDate: parsedExpiryDate ? parsedExpiryDate.toISOString() : undefined,
          issuerName: input.issuerName || undefined,
          issuerTitle: input.issuerTitle || undefined,
          certificateNumber: certNumber,
        };

        // DB Insert
        const certRecord = await prisma.certificate.create({
          data: {
            userId,
            templateId: template.id,
            contactId: contact.id,
            certificateNumber: certNumber,
            title: input.title,
            description: input.description,
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            issuerName: input.issuerName,
            issuerTitle: input.issuerTitle,
            pdfStorageKey,
            snapshotData: JSON.stringify(snapshot),
            status: 'ACTIVE',
          },
        });

        result.successful++;
        result.certificates.push({
          id: certRecord.id,
          certificateNumber: certRecord.certificateNumber,
          contactId: contact.id,
          contactName: contact.name,
          pdfStorageKey,
        });
      } catch (err: any) {
        console.error(`Failed to generate certificate for contact ${contact.name}:`, err);
        result.failed++;
        result.failures.push({
          contactId: contact.id,
          contactName: contact.name || contact.email || 'Unknown Contact',
          error: err.message || 'Rendering error',
        });
      }
    }

    return result;
  }

  /**
   * Revoke an issued certificate
   */
  static async revokeCertificate(userId: string, certificateId: string) {
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId },
    });

    if (!cert) {
      throw new Error('Certificate not found or unauthorized');
    }

    const updated = await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: 'REVOKED' },
    });

    return updated;
  }

  /**
   * List issued certificates for dashboard
   */
  static async listCertificates(userId: string) {
    const certs = await prisma.certificate.findMany({
      where: { userId },
      include: {
        contact: {
          select: { id: true, name: true, email: true, company: true },
        },
        template: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return certs.map((c) => ({
      ...c,
      snapshot: JSON.parse(c.snapshotData),
    }));
  }

  /**
   * Get single certificate detail
   */
  static async getCertificate(userId: string, certificateId: string) {
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId },
      include: {
        contact: true,
        template: true,
      },
    });

    if (!cert) return null;

    return {
      ...cert,
      snapshot: JSON.parse(cert.snapshotData),
    };
  }

  /**
   * Create a ZIP file of multiple certificate PDFs for bulk download
   */
  static async createBulkZip(userId: string, certificateIds: string[]): Promise<Buffer> {
    const certs = await prisma.certificate.findMany({
      where: {
        id: { in: certificateIds },
        userId,
      },
    });

    if (certs.length === 0) {
      throw new Error('No valid certificates found for ZIP generation');
    }

    const zip = new JSZip();

    for (const cert of certs) {
      if (cert.pdfStorageKey) {
        try {
          const pdfBuffer = await readStorageFile(cert.pdfStorageKey);
          const snapshot = JSON.parse(cert.snapshotData);
          const safeName = (snapshot.contactName || 'recipient').replace(/[^a-zA-Z0-9_-]/g, '_');
          const zipFileName = `${cert.certificateNumber}_${safeName}.pdf`;

          zip.file(zipFileName, pdfBuffer);
        } catch (fileErr) {
          console.error(`Failed to read PDF for certificate ${cert.certificateNumber}:`, fileErr);
        }
      }
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  /**
   * Emails a generated PDF certificate directly to the contact's email address via Gmail
   */
  static async emailCertificate(
    userId: string,
    certificateId: string,
    customSubject?: string,
    customBody?: string
  ) {
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId },
      include: { contact: true },
    });

    if (!cert) {
      throw new Error('Certificate not found or unauthorized');
    }

    if (!cert.contact?.email) {
      throw new Error(`Contact '${cert.contact?.name || 'Recipient'}' has no email address`);
    }

    if (!cert.pdfStorageKey) {
      throw new Error('Certificate PDF file is missing');
    }

    const pdfBuffer = await readStorageFile(cert.pdfStorageKey);
    const base64Pdf = pdfBuffer.toString('base64');
    const accessToken = await TokenManager.getValidAccessToken(userId);

    const snapshot = JSON.parse(cert.snapshotData || '{}');
    const subject = customSubject || `Your Official Certificate: ${cert.title} (${cert.certificateNumber})`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const htmlBody = customBody || `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Dear ${snapshot.contactName || cert.contact.name},</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Congratulations! Please find attached your official <strong>${cert.title}</strong> (Ref: <code>${cert.certificateNumber}</code>).
        </p>
        ${cert.description ? `<blockquote style="background: #f8fafc; border-left: 4px solid #6366f1; margin: 16px 0; padding: 12px 16px; font-style: italic; color: #334155;">"${cert.description}"</blockquote>` : ''}
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
          You can also verify your certificate online anytime at:<br/>
          <a href="${baseUrl}/certificate/${cert.certificateNumber}" style="color: #4f46e5; font-weight: bold; text-decoration: none;">
            ${baseUrl}/certificate/${cert.certificateNumber}
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          Issued via Aura AI Executive Assistant Platform
        </p>
      </div>
    `;

    const attachmentFilename = `${cert.certificateNumber}_${(cert.contact.name || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    await GmailClient.sendEmail(
      accessToken,
      cert.contact.email,
      subject,
      htmlBody,
      [
        {
          filename: attachmentFilename,
          mimeType: 'application/pdf',
          fileData: base64Pdf,
        },
      ]
    );

    return {
      success: true,
      recipientEmail: cert.contact.email,
      certificateNumber: cert.certificateNumber,
    };
  }

  /**
   * Delete an issued certificate (record & disk PDF file)
   */
  static async deleteCertificate(userId: string, certificateId: string) {
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId },
    });

    if (!cert) {
      throw new Error('Certificate not found or unauthorized');
    }

    if (cert.pdfStorageKey) {
      await deleteStorageFile(cert.pdfStorageKey);
    }

    await prisma.certificate.delete({
      where: { id: certificateId },
    });

    return { success: true };
  }

  /**
   * Delete multiple issued certificates in bulk (records & disk PDF files)
   */
  static async deleteBulkCertificates(userId: string, certificateIds: string[]) {
    const certs = await prisma.certificate.findMany({
      where: { id: { in: certificateIds }, userId },
    });

    for (const c of certs) {
      if (c.pdfStorageKey) {
        await deleteStorageFile(c.pdfStorageKey);
      }
    }

    await prisma.certificate.deleteMany({
      where: { id: { in: certificateIds }, userId },
    });

    return { success: true, count: certs.length };
  }
}
