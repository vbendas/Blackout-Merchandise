import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { loadActor } from '@/lib/services/team';
import { checkUploadToken, openObject, presignObject, receiveUpload, statObject } from '@/lib/services/print-storage';
import { handlePrintFileRequest } from '../handler';
import { handlePrintFileUpload } from '../upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSession() {
  const { user, store, role } = await requireUser();
  return { userId: user.id, role, storeId: store?.id ?? null };
}

// The access rules live in ../handler.ts (reads) and ../upload.ts (the PUT of a
// local upload link); this wires them to the session, the database and print
// storage.
async function serve(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }): Promise<Response> {
  const { key } = await ctx.params;
  return handlePrintFileRequest(req, key, {
    getSession,
    loadActor,
    async designStoreId(designId) {
      const [row] = await db.select({ storeId: schema.designs.storeId }).from(schema.designs).where(eq(schema.designs.id, designId)).limit(1);
      return row?.storeId ?? null;
    },
    stat: statObject,
    open: openObject,
    presign: presignObject,
  });
}

export const GET = serve;
export const HEAD = serve;

export async function PUT(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }): Promise<Response> {
  const { key } = await ctx.params;
  return handlePrintFileUpload(req, key, { getSession, loadActor, checkToken: checkUploadToken, receive: receiveUpload });
}
