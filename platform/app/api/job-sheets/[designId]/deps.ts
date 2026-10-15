// The real session and service behind the job sheet route (handler.ts holds the logic and takes
// these as stand-ins in tests).
import { getSession } from '@/lib/auth';
import type { Actor } from '@/lib/auth/permissions';
import { getDesignJobSheet } from '@/lib/services/job-sheets';
import type { JobSheetRouteDeps } from './handler';

/** Who is asking, or null when nobody is signed in. Not requireUser(): an API answers 401 and
 * 403 itself instead of redirecting to a page. A suspended employee is still returned, and
 * can() gives them nothing. */
async function sessionActor(): Promise<Actor | null> {
  return (await getSession())?.actor ?? null;
}

export function jobSheetDeps(): JobSheetRouteDeps {
  return { getActor: sessionActor, getSheet: getDesignJobSheet };
}
