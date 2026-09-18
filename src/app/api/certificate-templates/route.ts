import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CertificateTemplateService } from '@/services/certificates/certificate-template.service';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await CertificateTemplateService.listTemplates(session.user.id);
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Error fetching certificate templates:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let name: string;
    let description: string | undefined;
    let canvasWidth: number | undefined;
    let canvasHeight: number | undefined;
    let fields: any[] = [];
    let bgFile: { buffer: Buffer; filename: string; mimeType: string } | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name') as string;
      description = (formData.get('description') as string) || undefined;
      const widthStr = formData.get('canvasWidth') as string;
      const heightStr = formData.get('canvasHeight') as string;
      canvasWidth = widthStr ? parseInt(widthStr, 10) : undefined;
      canvasHeight = heightStr ? parseInt(heightStr, 10) : undefined;

      const fieldsRaw = formData.get('fields') as string;
      if (fieldsRaw) {
        fields = JSON.parse(fieldsRaw);
      }

      const file = formData.get('background') as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        bgFile = {
          buffer: Buffer.from(arrayBuffer),
          filename: file.name,
          mimeType: file.type || 'image/png',
        };
      }
    } else {
      const body = await request.json();
      name = body.name;
      description = body.description;
      canvasWidth = body.canvasWidth;
      canvasHeight = body.canvasHeight;
      fields = body.fields || [];
    }

    const template = await CertificateTemplateService.createTemplate(
      session.user.id,
      { name, description, canvasWidth, canvasHeight, fields },
      bgFile
    );

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error creating certificate template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 400 });
  }
}
