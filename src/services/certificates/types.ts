export type FieldType = 'CONTACT_FIELD' | 'CERTIFICATE_FIELD' | 'CUSTOM_FIELD' | 'QR_CODE';

export interface FieldConfig {
  id: string;
  type: FieldType;
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | string;
  alignment: 'left' | 'center' | 'right';
  color: string;
  autoFit: boolean;
  minFontSize: number;
  wrapping: boolean;
  maxLines?: number;
  customText?: string;
}

export interface AvailableFieldDef {
  key: string;
  label: string;
  type: FieldType;
  defaultText: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultFontSize: number;
  defaultFontWeight: 'normal' | 'bold';
  defaultAlignment: 'left' | 'center' | 'right';
}

export interface CertificateSnapshot {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactCompany?: string;
  contactPhone?: string;
  contactJobTitle?: string;
  contactDepartment?: string;
  contactWebsite?: string;
  contactLinkedin?: string;
  contactRelationshipType?: string;
  title: string;
  description?: string;
  issueDate: string;
  expiryDate?: string;
  issuerName?: string;
  issuerTitle?: string;
  certificateNumber: string;
}

export interface BatchGenerationResult {
  total: number;
  successful: number;
  failed: number;
  certificates: Array<{
    id: string;
    certificateNumber: string;
    contactId: string;
    contactName: string;
    pdfStorageKey: string | null;
  }>;
  failures: Array<{
    contactId: string;
    contactName: string;
    error: string;
  }>;
}
