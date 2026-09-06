import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { createDesignFromUpload } from '@/lib/services/designs';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { user, store } = await requireUser();

  const rate = checkRateLimit(`upload:${user.id}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() } },
    );
  }

  if (!store) {
    return NextResponse.json({ error: 'no_store' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `unsupported content type: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 25MB)' }, { status: 413 });
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const design = await createDesignFromUpload({
    storeId: store.id,
    data,
    contentType: file.type,
    filename: file.name || 'upload',
  });

  return NextResponse.json({
    designId: design.designId,
    url: design.originalUrl,
    previewUrl: design.previewUrl,
    widthPx: design.widthPx,
    heightPx: design.heightPx,
    readiness: design.readiness,
    notes: design.readinessNotes,
  });
}
