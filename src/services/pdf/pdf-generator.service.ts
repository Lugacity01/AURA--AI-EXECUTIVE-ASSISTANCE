import PDFDocument from "pdfkit/js/pdfkit.standalone";

export interface PdfGenerationOptions {
  title?: string;
  content: string;
  organizationName?: string;
}

export class PdfGeneratorService {
  /**
   * Generates a styled PDF Buffer from formatted text/content.
   */
  static async generatePdfBuffer(options: PdfGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
          info: {
            Title: options.title || "Official Notice",
            Author: options.organizationName || "AURA AI Platform",
          }
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", (err: Error) => reject(err));

        const orgName = (options.organizationName || "LUGACITY OPTIMAL SOLUTIONS").toUpperCase();

        // Header Branding
        doc
          .fillColor("#4F46E5")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(orgName, 50, 45);

        doc
          .fillColor("#6B7280")
          .fontSize(9)
          .font("Helvetica")
          .text("OFFICIAL DOCUMENTATION", 50, 62);

        // Divider Line
        doc
          .moveTo(50, 78)
          .lineTo(545, 78)
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .stroke();

        let currentY = 100;

        // Document Title
        if (options.title) {
          doc
            .fillColor("#111827")
            .fontSize(18)
            .font("Helvetica-Bold")
            .text(options.title, 50, currentY, { width: 495, align: "left" });
          
          currentY = doc.y + 15;
        }

        // Main Document Content
        const cleanContent = options.content || "No document content provided.";
        const paragraphs = cleanContent.split("\n");

        doc
          .fillColor("#1F2937")
          .fontSize(11)
          .font("Helvetica")
          .lineGap(5);

        for (const paragraph of paragraphs) {
          const trimmed = paragraph.trim();
          if (trimmed === "") {
            doc.moveDown(0.4);
          } else {
            doc.font("Helvetica").text(trimmed, { align: "left" });
            doc.moveDown(0.2);
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
