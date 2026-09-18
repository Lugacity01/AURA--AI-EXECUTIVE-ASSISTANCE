import fs from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const TEMPLATES_DIR = path.join(PUBLIC_DIR, 'uploads', 'certificates', 'templates');
const GENERATED_DIR = path.join(PUBLIC_DIR, 'uploads', 'certificates', 'generated');

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // Ignore existing directory error
  }
}

export async function saveTemplateBackground(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<string> {
  await ensureDir(TEMPLATES_DIR);

  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.png';
  const filename = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(TEMPLATES_DIR, filename);

  await fs.writeFile(filePath, fileBuffer);
  return `/uploads/certificates/templates/${filename}`;
}

export async function saveGeneratedPdf(
  fileBuffer: Buffer,
  certificateNumber: string
): Promise<string> {
  await ensureDir(GENERATED_DIR);

  const safeNum = certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `cert_${safeNum}_${Date.now()}.pdf`;
  const filePath = path.join(GENERATED_DIR, filename);

  await fs.writeFile(filePath, fileBuffer);
  return `/uploads/certificates/generated/${filename}`;
}

export async function readStorageFile(storageKey: string): Promise<Buffer> {
  // Strip leading slash if present
  const relativePath = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
  const fullPath = path.join(PUBLIC_DIR, relativePath);
  return await fs.readFile(fullPath);
}

export async function deleteStorageFile(storageKey: string): Promise<void> {
  try {
    const relativePath = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
    const fullPath = path.join(PUBLIC_DIR, relativePath);
    await fs.unlink(fullPath);
  } catch (err) {
    // Ignore file deletion error if missing
  }
}
