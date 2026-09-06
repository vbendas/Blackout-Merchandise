import { NextResponse } from 'next/server';
import { checkDomain, listPendingOrVerifyingDomains } from '@/lib/services/domains';

// Cron-style re-check: Vercel/host cron hits this with the shared secret on
// a schedule so a domain that goes verified between chat sessions still
// flips to active and notifies the artist, without them having to ask.
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const domains = await listPendingOrVerifyingDomains();

  let active = 0;
  let stillPending = 0;
  let errored = 0;

  for (const domain of domains) {
    const outcome = await checkDomain(domain.hostname);
    if (!outcome.ok) {
      errored += 1;
      continue;
    }
    if (outcome.status === 'active') active += 1;
    else if (outcome.status === 'error') errored += 1;
    else stillPending += 1;
  }

  return NextResponse.json({ checked: domains.length, active, stillPending, errored });
}
