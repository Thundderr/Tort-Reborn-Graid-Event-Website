import { NextRequest, NextResponse } from 'next/server';
import { getS3 } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

// Content types we're willing to serve. Keeps us from becoming a generic file
// proxy if the key were ever tampered with.
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

// Public endpoint (no auth) so Discord's CDN can fetch embed images. Only
// serves objects under the `embeds/` prefix to limit the blast radius.
export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  // Prevent path traversal or access outside the managed embeds prefix.
  if (!key.startsWith('embeds/') || key.includes('..')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (!CONTENT_TYPE_BY_EXT[ext]) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  try {
    const { client, bucket } = getS3();
    const resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    const bytes = await resp.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const headers: Record<string, string> = {
      'Content-Type': resp.ContentType || CONTENT_TYPE_BY_EXT[ext],
      // Immutable because keys include a timestamp, so updates produce new URLs.
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
    if (resp.ETag) headers['ETag'] = resp.ETag;

    return new NextResponse(bytes, { headers });
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.Code === 'NoSuchKey') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('Embed image fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
