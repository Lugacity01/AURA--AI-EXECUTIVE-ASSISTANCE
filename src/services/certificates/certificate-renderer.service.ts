import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { FieldConfig } from './types';
import { resolveFieldValue } from './certificate-field-resolver';
import { getAppBaseUrl } from '@/lib/url-utils';

export interface RenderCertificateParams {
  canvasWidth: number;
  canvasHeight: number;
  backgroundBuffer?: Buffer | null;
  fields: FieldConfig[];
  contact?: Record<string, any> | null;
  certMeta?: {
    title?: string;
    description?: string;
    issueDate?: string | Date;
    expiryDate?: string | Date;
    issuerName?: string;
    issuerTitle?: string;
  } | null;
  certificateNumber: string;
  baseUrl?: string;
}

export class CertificateRendererService {
  /**
   * Render a Certificate PDF Buffer deterministically using canonical coordinates
   */
  static async renderCertificatePdf(params: RenderCertificateParams): Promise<Buffer> {
    const {
      canvasWidth = 1000,
      canvasHeight = 707,
      backgroundBuffer,
      fields = [],
      contact,
      certMeta,
      certificateNumber,
      baseUrl = params.baseUrl || getAppBaseUrl(),
    } = params;


    // 1. Pre-render any QR Code buffers asynchronously before PDF stream initialization
    const qrCodeBuffers = new Map<string, Buffer>();
    for (const field of fields) {
      if (field.type === 'QR_CODE') {
        const verificationUrl = `${baseUrl}/certificate/${certificateNumber}`;
        try {
          const qrBuf = await QRCode.toBuffer(verificationUrl, {
            margin: 1,
            width: Math.max(20, Math.round(field.width || 100)),
          });
          qrCodeBuffers.set(field.id, qrBuf);
        } catch (qrErr) {
          console.error('Failed to generate QR Code buffer for field:', field.id, qrErr);
        }
      }
    }

    // 2. Synchronously construct PDFDocument
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [canvasWidth, canvasHeight],
          margin: 0,
          info: {
            Title: certMeta?.title || 'Certificate',
            Author: 'Aura AI Certificate System',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: any) => reject(err));

        // Draw Background Image if present
        if (backgroundBuffer && backgroundBuffer.length > 0) {
          try {
            doc.image(backgroundBuffer, 0, 0, {
              width: canvasWidth,
              height: canvasHeight,
            });
          } catch (imgErr) {
            console.error('Failed to draw background image on PDF:', imgErr);
          }
        }

        // Render Dynamic Fields
        for (const field of fields) {
          const resolvedValue = resolveFieldValue(field, contact, certMeta, certificateNumber);

          if (field.type === 'QR_CODE') {
            const qrBuf = qrCodeBuffers.get(field.id);
            if (qrBuf) {
              try {
                doc.image(qrBuf, field.x, field.y, {
                  width: field.width,
                  height: field.height,
                });
              } catch (qrDrawErr) {
                console.error('Failed to draw QR code on PDF:', qrDrawErr);
              }
            }
            continue;
          }

          if (!resolvedValue || resolvedValue.trim() === '') {
            continue;
          }

          // Map Font Family to PDFKit built-in fonts
          let fontName = 'Helvetica';
          const lowerFamily = (field.fontFamily || '').toLowerCase();
          const isBold = field.fontWeight === 'bold' || String(field.fontWeight) === '700';

          if (lowerFamily.includes('times')) {
            fontName = isBold ? 'Times-Bold' : 'Times-Roman';
          } else if (lowerFamily.includes('courier')) {
            fontName = isBold ? 'Courier-Bold' : 'Courier';
          } else {
            fontName = isBold ? 'Helvetica-Bold' : 'Helvetica';
          }

          let currentFontSize = field.fontSize || 16;
          doc.font(fontName);
          doc.fontSize(currentFontSize);

          // Auto-Fit scaling algorithm
          if (field.autoFit) {
            const minSize = field.minFontSize !== undefined && field.minFontSize !== null ? field.minFontSize : 2;
            const textWidth = doc.widthOfString(resolvedValue);

            if (textWidth > field.width && textWidth > 0) {
              const targetSize = Math.floor(currentFontSize * (field.width / textWidth));
              currentFontSize = Math.max(targetSize, minSize);
              doc.fontSize(currentFontSize);
            }
          }

          // Convert hex color to PDFKit rgb
          const colorHex = field.color || '#000000';
          doc.fillColor(colorHex);

          // PDFKit alignment mapping
          const pdfAlign = (field.alignment || 'center') as 'left' | 'center' | 'right' | 'justify';

          // Render text box inside canonical bounding box (x, y, width, height)
          doc.text(resolvedValue, field.x, field.y, {
            width: field.width,
            height: field.height,
            align: pdfAlign,
            ellipsis: true,
            lineBreak: field.wrapping !== false,
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

