// DEV ONLY (WP3, gate G1). Server wrapper for the face specimen board.
//
// Only a route when the `dev.tsx` page extension is registered (next.config.ts:
// development, or SPECIMEN=1 at build). Defence in depth: even when compiled
// into a production build it 404s unless SPECIMEN=1 at request time.
// Docs: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/pageExtensions.md
import { notFound } from 'next/navigation';
import { parseState } from './faces';
import { Specimen } from './Specimen';

export default async function SpecimenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === 'production' && process.env.SPECIMEN !== '1') notFound();
  const initial = parseState(await searchParams);
  return <Specimen initial={initial} />;
}
