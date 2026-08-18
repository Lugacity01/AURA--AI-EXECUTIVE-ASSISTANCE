import PDFDocument from "pdfkit/js/pdfkit.standalone";

export interface PdfGenerationOptions {
  title?: string;
  content: string;
  organizationName?: string;
  headerImage?: string | null;
  backgroundFit?: "A4" | "HEADER" | string | null;
  contentX?: number | null;
  contentY?: number | null;
  contentWidth?: number | null;
  contentHeight?: number | null;
  fontSize?: number | null;
  lineHeight?: number | null;
  alignment?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFY" | string | null;
}

export interface PdfGenerationResult {
  pdfBuffer: Buffer;
  overflow: boolean;
  renderedTextHeight: number;
  maxAllowedHeight: number;
}

export class PdfGeneratorService {
  /**
   * Generates a styled PDF Buffer from formatted text/content with A4 background & content box overlay.
   */
  static async generatePdfBuffer(options: PdfGenerationOptions): Promise<Buffer> {
    const res = await this.generatePdfWithMetrics(options);
    return res.pdfBuffer;
  }

  /**
   * Generates PDF buffer and layout metrics (text height & overflow detection).
   */
  static async generatePdfWithMetrics(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 0, // Zero margin for full-bleed background control
          info: {
            Title: options.title || "Official Notice",
            Author: options.organizationName || "AURA AI Platform",
          }
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));

        const fitMode = options.backgroundFit || "A4";

        // Layer 1: Render A4 Background Image or Header Banner
        if (options.headerImage && options.headerImage.trim() !== "") {
          try {
            const imageDataUrl = options.headerImage.startsWith("data:")
              ? options.headerImage
              : `data:image/png;base64,${options.headerImage}`;

            if (fitMode === "A4") {
              // Full-bleed A4 Page Background (595.28pt x 841.89pt)
              doc.image(imageDataUrl, 0, 0, {
                width: 595.28,
                height: 841.89
              });
            } else {
              // Header mode
              doc.image(imageDataUrl, 50, 20, {
                width: 495,
                height: 100
              });
            }
          } catch (imgErr) {
            console.error("Failed to render background letterhead image in PDF:", imgErr);
            const orgName = (options.organizationName || "LUGACITY OPTIMAL SOLUTIONS").toUpperCase();
            doc.fillColor("#4F46E5").fontSize(14).font("Helvetica-Bold").text(orgName, 50, 45);
            if (options.title) {
              doc.fillColor("#6B7280").fontSize(9).font("Helvetica").text(options.title.toUpperCase(), 50, 62);
            }
            doc.moveTo(50, 78).lineTo(545, 78).strokeColor("#E5E7EB").lineWidth(1).stroke();
          }
        } else if (fitMode === "HEADER") {
          const orgName = (options.organizationName || "LUGACITY OPTIMAL SOLUTIONS").toUpperCase();
          doc.fillColor("#4F46E5").fontSize(14).font("Helvetica-Bold").text(orgName, 50, 45);
          if (options.title) {
            doc.fillColor("#6B7280").fontSize(9).font("Helvetica").text(options.title.toUpperCase(), 50, 62);
          }
          doc.moveTo(50, 78).lineTo(545, 78).strokeColor("#E5E7EB").lineWidth(1).stroke();
        }

        // Layer 2: Text Layer inside Content Box Bounds
        const boxX = options.contentX ?? 70;
        const boxY = options.contentY ?? 180;
        const boxWidth = options.contentWidth ?? 455;
        const boxHeight = options.contentHeight ?? 550;
        const fontSize = options.fontSize ?? 11;
        const lineHeight = options.lineHeight ?? 1.4;

        const pdfAlignMap: Record<string, "left" | "center" | "right" | "justify"> = {
          LEFT: "left",
          CENTER: "center",
          RIGHT: "right",
          JUSTIFY: "justify"
        };
        const textAlignment = pdfAlignMap[options.alignment || "LEFT"] || "left";

        let startY = boxY;

        // Document Title if present
        if (options.title) {
          doc
            .fillColor("#111827")
            .fontSize(fontSize + 4)
            .font("Helvetica-Bold")
            .text(options.title, boxX, startY, {
              width: boxWidth,
              align: textAlignment
            });
          startY = doc.y + 12;
        }

        // Main Document Content
        const cleanContent = options.content || "No document content provided.";
        const lineGap = Math.max(1, fontSize * (lineHeight - 1));

        doc
          .fillColor("#1F2937")
          .fontSize(fontSize)
          .font("Helvetica")
          .lineGap(lineGap);

        doc.text(cleanContent, boxX, startY, {
          width: boxWidth,
          align: textAlignment
        });

        const totalRenderedTextHeight = doc.y - boxY;
        const isOverflow = totalRenderedTextHeight > boxHeight;

        doc.on("end", () => {
          resolve({
            pdfBuffer: Buffer.concat(buffers),
            overflow: isOverflow,
            renderedTextHeight: Math.round(totalRenderedTextHeight),
            maxAllowedHeight: boxHeight
          });
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * ⚡ Auto Fit Engine: Calculates optimal layout params to fit content within letterhead.
   */
  static autoFitContent(text: string, currentOptions: { contentY?: number; contentHeight?: number; fontSize?: number; lineHeight?: number }) {
    const charCount = (text || "").length;
    let fontSize = currentOptions.fontSize || 11;
    let lineHeight = currentOptions.lineHeight || 1.4;
    let contentY = currentOptions.contentY || 180;
    let contentHeight = currentOptions.contentHeight || 550;

    const avgCharsPerLine = Math.floor(455 / (fontSize * 0.55));
    const totalLines = Math.ceil(charCount / avgCharsPerLine) + (text.split("\n").length - 1);
    const estimatedHeight = totalLines * (fontSize * lineHeight);

    if (estimatedHeight > contentHeight) {
      if (fontSize > 10) {
        fontSize = 10;
        lineHeight = 1.3;
      } else if (fontSize > 9) {
        fontSize = 9.5;
        lineHeight = 1.25;
      }
      contentHeight = Math.min(620, contentHeight + 40);
    } else if (estimatedHeight < contentHeight * 0.5 && charCount < 400) {
      fontSize = 12;
      lineHeight = 1.45;
    }

    return {
      contentY,
      contentHeight,
      fontSize,
      lineHeight
    };
  }
}
