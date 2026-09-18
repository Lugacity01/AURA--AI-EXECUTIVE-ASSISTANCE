import { prisma } from '@/lib/prisma';
import { validateTemplateData } from './certificate-validation.service';
import { saveTemplateBackground, deleteStorageFile } from './certificate-storage.service';

export interface CreateTemplateInput {
  name: string;
  description?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  fields: any[];
}

export class CertificateTemplateService {
  static async createTemplate(
    userId: string,
    input: CreateTemplateInput,
    bgFile?: { buffer: Buffer; filename: string; mimeType: string }
  ) {
    const validated = validateTemplateData(input);

    let backgroundStorageKey: string | undefined = undefined;
    let backgroundMimeType: string | undefined = undefined;

    if (bgFile && bgFile.buffer.length > 0) {
      backgroundStorageKey = await saveTemplateBackground(bgFile.buffer, bgFile.filename, bgFile.mimeType);
      backgroundMimeType = bgFile.mimeType;
    }

    const template = await prisma.certificateTemplate.create({
      data: {
        userId,
        name: validated.name,
        description: validated.description,
        canvasWidth: validated.canvasWidth,
        canvasHeight: validated.canvasHeight,
        fields: JSON.stringify(validated.fields),
        backgroundStorageKey,
        backgroundMimeType,
      },
    });

    return {
      ...template,
      parsedFields: JSON.parse(template.fields),
    };
  }

  static async updateTemplate(
    userId: string,
    templateId: string,
    input: Partial<CreateTemplateInput>,
    bgFile?: { buffer: Buffer; filename: string; mimeType: string }
  ) {
    const existing = await prisma.certificateTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existing) {
      throw new Error('Certificate template not found or unauthorized');
    }

    const existingFields = JSON.parse(existing.fields);
    const mergedInput = {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description ?? undefined,
      canvasWidth: input.canvasWidth ?? existing.canvasWidth,
      canvasHeight: input.canvasHeight ?? existing.canvasHeight,
      fields: input.fields ?? existingFields,
    };

    const validated = validateTemplateData(mergedInput);

    let backgroundStorageKey = existing.backgroundStorageKey;
    let backgroundMimeType = existing.backgroundMimeType;

    if (bgFile && bgFile.buffer.length > 0) {
      if (existing.backgroundStorageKey) {
        await deleteStorageFile(existing.backgroundStorageKey);
      }
      backgroundStorageKey = await saveTemplateBackground(bgFile.buffer, bgFile.filename, bgFile.mimeType);
      backgroundMimeType = bgFile.mimeType;
    }

    const updated = await prisma.certificateTemplate.update({
      where: { id: templateId },
      data: {
        name: validated.name,
        description: validated.description,
        canvasWidth: validated.canvasWidth,
        canvasHeight: validated.canvasHeight,
        fields: JSON.stringify(validated.fields),
        backgroundStorageKey,
        backgroundMimeType,
      },
    });

    return {
      ...updated,
      parsedFields: JSON.parse(updated.fields),
    };
  }

  static async getTemplate(userId: string, templateId: string) {
    const template = await prisma.certificateTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      return null;
    }

    return {
      ...template,
      parsedFields: JSON.parse(template.fields),
    };
  }

  static async listTemplates(userId: string) {
    const templates = await prisma.certificateTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((t) => ({
      ...t,
      parsedFields: JSON.parse(t.fields),
    }));
  }

  static async deleteTemplate(userId: string, templateId: string) {
    const existing = await prisma.certificateTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existing) {
      throw new Error('Template not found or unauthorized');
    }

    if (existing.backgroundStorageKey) {
      await deleteStorageFile(existing.backgroundStorageKey);
    }

    // Delete generated PDF files of certificates belonging to this template
    const certs = await prisma.certificate.findMany({
      where: { templateId, userId },
      select: { pdfStorageKey: true },
    });
    for (const c of certs) {
      if (c.pdfStorageKey) {
        await deleteStorageFile(c.pdfStorageKey);
      }
    }

    await prisma.certificateTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
  }
}
