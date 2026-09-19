/**
 * Resolves the application base URL dynamically across local development and Vercel serverless production.
 */
export function getAppBaseUrl(): string {
  // 1. Explicit production URL set via NEXT_PUBLIC_APP_URL (excluding default localhost)
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Vercel Production Domain (e.g. ai-assistance-eight.vercel.app)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '');
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }

  // 3. Vercel Deployment URL
  if (process.env.VERCEL_URL) {
    const domain = process.env.VERCEL_URL.replace(/\/$/, '');
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }

  // 4. Fallback for Localhost Dev Environment
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
