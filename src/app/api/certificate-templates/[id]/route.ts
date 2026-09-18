import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CertificateTemplateService } from '@/services/certificates/certificate-template.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const template = await CertificateTemplateService.getTemplate(session.user.id, id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    let input: any = {};
    let bgFile: { buffer: Buffer; filename: string; mimeType: string } | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.has('name')) input.name = formData.get('name') as string;
      if (formData.has('description')) input.description = formData.get('description') as string;
      if (formData.has('canvasWidth')) input.canvasWidth = parseInt(formData.get('canvasWidth') as string, 10);
      if (formData.has('canvasHeight')) input.canvasHeight = parseInt(formData.get('canvasHeight') as string, 10);
      if (formData.has('fields')) input.fields = JSON.parse(formData.get('fields') as string);

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
      input = await request.json();
    }

    const updated = await CertificateTemplateService.updateTemplate(
      session.user.id,
      id,
      input,
      bgFile
    );

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await CertificateTemplateService.deleteTemplate(session.user.id, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 400 });
  }
}
