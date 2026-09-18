import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const TEMPLATES_DIR = path.join(PUBLIC_DIR, 'uploads', 'certificates', 'templates');
const GENERATED_DIR = path.join(PUBLIC_DIR, 'uploads', 'certificates', 'generated');
const TMP_DIR = os.tmpdir();

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    // Ignore existing directory error
  }
}

/**
 * Saves template background image. Stores as Base64 Data URL to guarantee
 * 100% availability on Vercel serverless environments without filesystem dependency.
 */
export async function saveTemplateBackground(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<string> {
  const safeMime = mimeType || 'image/png';
  const base64Str = fileBuffer.toString('base64');
  const dataUrl = `data:${safeMime};base64,${base64Str}`;

  // Optionally try writing to disk on localhost for local dev convenience
  try {
    await ensureDir(TEMPLATES_DIR);
    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.png';
    const filename = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(TEMPLATES_DIR, filename);
    await fs.writeFile(filePath, fileBuffer);
  } catch (err) {
    // Disk write failed on Vercel serverless; safe to ignore because dataUrl is returned
  }

  return dataUrl;
}

/**
 * Saves generated PDF. Tries writing to public directory or /tmp directory on serverless.
 */
export async function saveGeneratedPdf(
  fileBuffer: Buffer,
  certificateNumber: string
): Promise<string> {
  const safeNum = certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `cert_${safeNum}_${Date.now()}.pdf`;

  try {
    await ensureDir(GENERATED_DIR);
    const filePath = path.join(GENERATED_DIR, filename);
    await fs.writeFile(filePath, fileBuffer);
    return `/uploads/certificates/generated/${filename}`;
  } catch (err) {
    try {
      const tmpPath = path.join(TMP_DIR, filename);
      await fs.writeFile(tmpPath, fileBuffer);
      return `/tmp/${filename}`;
    } catch (tmpErr) {
      return `/uploads/certificates/generated/${filename}`;
    }
  }
}


export async function readStorageFile(storageKey: string): Promise<Buffer> {
  if (!storageKey) {
    throw new Error('Storage key is empty');
  }

  // 1. Handle Base64 Data URLs
  if (storageKey.startsWith('data:')) {
    const parts = storageKey.split(',');
    const base64Data = parts[1] || parts[0];
    return Buffer.from(base64Data, 'base64');
  }

  // 2. Handle Remote HTTP / HTTPS URLs
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    const res = await fetch(storageKey);
    if (!res.ok) {
      throw new Error(`Failed to fetch remote storage file: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // 3. Try reading from public directory (localhost)
  try {
    const relativePath = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
    const fullPath = path.join(PUBLIC_DIR, relativePath);
    return await fs.readFile(fullPath);
  } catch (err) {
    // 4. Try reading from /tmp directory (Vercel)
    try {
      const filename = path.basename(storageKey);
      const tmpPath = path.join(TMP_DIR, filename);
      return await fs.readFile(tmpPath);
    } catch (tmpErr) {
      // 5. Try fetching relative path from NEXT_PUBLIC_APP_URL or VERCEL_URL if available
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
      if (baseUrl) {
        try {
          const fullUrl = `${baseUrl}${storageKey.startsWith('/') ? '' : '/'}${storageKey}`;
          const res = await fetch(fullUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer);
          }
        } catch (fetchErr) {
          // Fall through
        }
      }
      throw new Error(`File not found on disk or storage: ${storageKey}`);
    }
  }
}

/**
 * Removes file from disk if present.
 */
export async function deleteStorageFile(storageKey: string): Promise<void> {
  if (!storageKey || storageKey.startsWith('data:')) {
    return;
  }

  try {
    const relativePath = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
    const fullPath = path.join(PUBLIC_DIR, relativePath);
    await fs.unlink(fullPath);
  } catch (err) {
    try {
      const filename = path.basename(storageKey);
      const tmpPath = path.join(TMP_DIR, filename);
      await fs.unlink(tmpPath);
    } catch (tmpErr) {
      // Ignore file missing error
    }
  }
}
