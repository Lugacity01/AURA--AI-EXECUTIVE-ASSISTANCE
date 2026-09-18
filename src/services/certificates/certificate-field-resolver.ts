import { AvailableFieldDef, FieldConfig } from './types';

export const AVAILABLE_FIELDS: AvailableFieldDef[] = [
  // Contact Fields
  {
    key: 'contact.name',
    label: 'Contact Name',
    type: 'CONTACT_FIELD',
    defaultText: 'John Doe',
    defaultWidth: 400,
    defaultHeight: 50,
    defaultFontSize: 32,
    defaultFontWeight: 'bold',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.company',
    label: 'Company',
    type: 'CONTACT_FIELD',
    defaultText: 'Acme Corporation',
    defaultWidth: 350,
    defaultHeight: 35,
    defaultFontSize: 20,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.jobTitle',
    label: 'Job Title',
    type: 'CONTACT_FIELD',
    defaultText: 'Software Engineer',
    defaultWidth: 300,
    defaultHeight: 30,
    defaultFontSize: 18,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.email',
    label: 'Email',
    type: 'CONTACT_FIELD',
    defaultText: 'john@example.com',
    defaultWidth: 300,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.phone',
    label: 'Phone',
    type: 'CONTACT_FIELD',
    defaultText: '+1 (555) 000-1234',
    defaultWidth: 250,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.department',
    label: 'Department',
    type: 'CONTACT_FIELD',
    defaultText: 'Engineering',
    defaultWidth: 250,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.website',
    label: 'Website',
    type: 'CONTACT_FIELD',
    defaultText: 'www.acme.com',
    defaultWidth: 250,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.linkedin',
    label: 'LinkedIn',
    type: 'CONTACT_FIELD',
    defaultText: 'linkedin.com/in/johndoe',
    defaultWidth: 250,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'contact.relationshipType',
    label: 'Relationship Type',
    type: 'CONTACT_FIELD',
    defaultText: 'Client',
    defaultWidth: 200,
    defaultHeight: 25,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },

  // Certificate Specific Fields
  {
    key: 'cert.title',
    label: 'Certificate Title',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'Certificate of Completion',
    defaultWidth: 600,
    defaultHeight: 60,
    defaultFontSize: 38,
    defaultFontWeight: 'bold',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.description',
    label: 'Description / Reason',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'For successfully demonstrating outstanding leadership and excellence in AI assistance implementation.',
    defaultWidth: 650,
    defaultHeight: 80,
    defaultFontSize: 18,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.issueDate',
    label: 'Issue Date',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'September 13, 2026',
    defaultWidth: 200,
    defaultHeight: 30,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.expiryDate',
    label: 'Expiry Date',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'September 13, 2029',
    defaultWidth: 200,
    defaultHeight: 30,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.certificateNumber',
    label: 'Certificate Number',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'AURA-CERT-2026-X8F92K',
    defaultWidth: 280,
    defaultHeight: 25,
    defaultFontSize: 14,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.issuerName',
    label: 'Issuer Name',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'Dr. Sarah Jenkins',
    defaultWidth: 250,
    defaultHeight: 35,
    defaultFontSize: 20,
    defaultFontWeight: 'bold',
    defaultAlignment: 'center',
  },
  {
    key: 'cert.issuerTitle',
    label: 'Issuer Title',
    type: 'CERTIFICATE_FIELD',
    defaultText: 'Director of Operations',
    defaultWidth: 250,
    defaultHeight: 25,
    defaultFontSize: 14,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },

  // Custom Fields
  {
    key: 'customText',
    label: 'Custom Text',
    type: 'CUSTOM_FIELD',
    defaultText: 'Insert Custom Text',
    defaultWidth: 300,
    defaultHeight: 30,
    defaultFontSize: 16,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },

  // QR Code
  {
    key: 'qrCode',
    label: 'Verification QR Code',
    type: 'QR_CODE',
    defaultText: 'QR Code Verification',
    defaultWidth: 80,
    defaultHeight: 80,
    defaultFontSize: 10,
    defaultFontWeight: 'normal',
    defaultAlignment: 'center',
  },
];

export function resolveFieldValue(
  field: FieldConfig,
  contact: Record<string, any> | null | undefined,
  certMeta: {
    title?: string;
    description?: string;
    issueDate?: string | Date;
    expiryDate?: string | Date;
    issuerName?: string;
    issuerTitle?: string;
  } | null | undefined,
  certificateNumber: string
): string {
  if (field.type === 'QR_CODE') {
    return certificateNumber;
  }

  if (field.type === 'CUSTOM_FIELD') {
    return field.customText || field.label || '';
  }

  const formatDate = (val?: string | Date) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  switch (field.key) {
    // Contact Fields
    case 'contact.name':
      return contact?.name || '';
    case 'contact.company':
      return contact?.company || '';
    case 'contact.jobTitle':
      return contact?.jobTitle || '';
    case 'contact.email':
      return contact?.email || '';
    case 'contact.phone':
      return contact?.phone || '';
    case 'contact.department':
      return contact?.department || '';
    case 'contact.website':
      return contact?.website || '';
    case 'contact.linkedin':
      return contact?.linkedin || '';
    case 'contact.relationshipType':
      return contact?.relationshipType || '';

    // Certificate Fields
    case 'cert.title':
      return certMeta?.title || 'Certificate';
    case 'cert.description':
      return certMeta?.description || '';
    case 'cert.issueDate':
      return formatDate(certMeta?.issueDate || new Date());
    case 'cert.expiryDate':
      return formatDate(certMeta?.expiryDate);
    case 'cert.certificateNumber':
      return certificateNumber;
    case 'cert.issuerName':
      return certMeta?.issuerName || '';
    case 'cert.issuerTitle':
      return certMeta?.issuerTitle || '';

    default:
      return field.customText || '';
  }
}
