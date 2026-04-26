import { NextRequest, NextResponse } from 'next/server';
import { requireChiefSession, getBaseUrl } from '@/lib/exec-auth';
import { getS3 } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — well under Discord's embed image limit
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function sanitizeFilename(name: string): string {
  // Keep alphanumerics, dots, dashes, underscores. Replace everything else.
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

export async function POST(request: NextRequest) {
  const session = await requireChiefSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name) || `upload_${timestamp}`;
  const key = `embeds/uploads/${timestamp}_${safeName}`;

  try {
    const { client, bucket } = getS3();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: file.type,
    }));
  } catch (error) {
    console.error('Embed image upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const base = getBaseUrl().replace(/\/$/, '');
  const url = `${base}/api/embeds/image?key=${encodeURIComponent(key)}`;

  return NextResponse.json({ success: true, url, key });
}
