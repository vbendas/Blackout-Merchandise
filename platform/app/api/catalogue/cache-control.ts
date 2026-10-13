/** The feed is the same for every artist but behind sign-in, so browsers may
 * keep it (privately) for a few minutes and show it while a fresh copy loads.
 * A copy built without prices (the price query failed) is not kept. */
export function catalogueCacheControl(complete: boolean): string {
  return complete ? 'private, max-age=300, stale-while-revalidate=3600' : 'no-store';
}
