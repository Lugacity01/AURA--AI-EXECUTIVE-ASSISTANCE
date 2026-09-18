import { z } from 'zod';

export const FieldConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['CONTACT_FIELD', 'CERTIFICATE_FIELD', 'CUSTOM_FIELD', 'QR_CODE']),
  key: z.string().min(1),
  label: z.string().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  fontFamily: z.string().optional().nullable().transform((val) => val || 'Helvetica'),
  fontSize: z.number().min(1).optional().nullable().transform((val) => (val !== undefined && val !== null ? Math.max(1, val) : 16)),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.string(), z.number()]).optional().nullable().transform((val) => (val ? String(val) : 'normal')),
  alignment: z.enum(['left', 'center', 'right']).optional().nullable().transform((val) => val || 'center'),
  color: z.string().optional().nullable().transform((val) => (val && /^#[0-9A-Fa-f]{3,8}$/.test(val) ? val : '#000000')),
  autoFit: z.boolean().optional().nullable().transform((val) => val !== false),
  minFontSize: z.number().min(1).optional().nullable().transform((val) => (val !== undefined && val !== null ? Math.max(1, val) : 2)),
  wrapping: z.boolean().optional().nullable().transform((val) => val !== false),
  maxLines: z.number().positive().optional().nullable().transform((val) => val || undefined),
  customText: z.string().optional().nullable().transform((val) => val || undefined),
});

export const CertificateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  canvasWidth: z.number().int().min(400).max(3000).default(1000),
  canvasHeight: z.number().int().min(300).max(3000).default(707),
  fields: z.array(FieldConfigSchema),
});

export function validateTemplateData(data: unknown) {
  const result = CertificateTemplateSchema.safeParse(data);
  if (!result.success) {
    const issueMessages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid Certificate Template configuration: ${issueMessages}`);
  }

  const template = result.data;

  // Sanitize and clamp fields so canvas coordinates stay within canvas bounds
  const sanitizedFields = template.fields.map((field) => {
    let x = Math.max(0, field.x);
    let y = Math.max(0, field.y);
    let width = Math.max(10, field.width);
    let height = Math.max(10, field.height);

    if (x >= template.canvasWidth) {
      x = Math.max(0, template.canvasWidth - width);
    }
    if (y >= template.canvasHeight) {
      y = Math.max(0, template.canvasHeight - height);
    }

    return {
      ...field,
      x,
      y,
      width,
      height,
    };
  });

  return {
    ...template,
    description: template.description || undefined,
    fields: sanitizedFields,
  };
}
