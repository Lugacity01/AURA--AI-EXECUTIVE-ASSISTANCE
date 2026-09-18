import PDFDocument from 'pdfkit/js/pdfkit.standalone';
import QRCode from 'qrcode';
import { FieldConfig } from './types';
import { resolveFieldValue } from './certificate-field-resolver';

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
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    } = params;

    return new Promise(async (resolve, reject) => {
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

        // 1. Draw Background Image if present
        if (backgroundBuffer && backgroundBuffer.length > 0) {
          try {
            const isJpeg = backgroundBuffer[0] === 0xff && backgroundBuffer[1] === 0xd8 && backgroundBuffer[2] === 0xff;
            const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
            const bgDataUrl = `data:${mimeType};base64,${backgroundBuffer.toString('base64')}`;

            doc.image(bgDataUrl, 0, 0, {
              width: canvasWidth,
              height: canvasHeight,
            });
          } catch (imgErr) {
            console.error('Failed to draw background image on PDF:', imgErr);
          }
        }

        // 2. Render Dynamic Fields
        for (const field of fields) {
          const resolvedValue = resolveFieldValue(field, contact, certMeta, certificateNumber);

          if (field.type === 'QR_CODE') {
            const verificationUrl = `${baseUrl}/certificate/${certificateNumber}`;
            try {
              const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
                margin: 1,
                width: Math.round(field.width),
              });
              doc.image(qrDataUrl, field.x, field.y, {
                width: field.width,
                height: field.height,
              });
            } catch (qrErr) {
              console.error('Failed to render QR Code on certificate PDF:', qrErr);
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

            if (textWidth > field.width) {
              const targetSize = Math.floor(currentFontSize * (field.width / textWidth));
              currentFontSize = Math.max(targetSize, minSize);
              doc.fontSize(currentFontSize);
            }
          }

          // Convert hex color to PDFKit rgb
          const colorHex = field.color || '#000000';
          doc.fillColor(colorHex);

          // PDFKit alignment mapping
          const pdfAlign = field.alignment || 'center';

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
