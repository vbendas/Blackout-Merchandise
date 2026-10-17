// A job's screens as the floor reads them: each with the film it prints from, in the job sheet's words (the
// ink and its Pantone code, the base, the mesh, the ruling). The service lists the screens with the pack each is
// in and its press position; the job sheet's screen sets carry their pack, so they are matched by those. A pack the
// sheet no longer shows (replaced since the screens were made) is matched by the set's name and its film count
// instead, and a screen with no film to match still shows, with what the service says of it. Pure and client-safe.
import type { JobSheetView, JobSheetViewFilm, JobSheetViewSet } from '@/lib/print/job-sheet-view';
import type { ScreenProgress } from '@/lib/services/production-progress';

export interface FilmRow {
  screen: ScreenProgress;
  /** the film on the job sheet; null when the sheet has none to match */
  film: JobSheetViewFilm | null;
}

/** The screens of one pack: one set of films. */
export interface FilmGroup {
  key: string;
  setName: string;
  /** the job sheet's set; null when there is no sheet or no set to match */
  set: JobSheetViewSet | null;
  rows: FilmRow[];
}

/** '2/6' -> 6, the films the set was made with. */
function filmCountOf(position: string): number | null {
  const n = Number(/\/(\d+)\s*$/.exec(position)?.[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function matchFilms(view: JobSheetView | null, screens: readonly ScreenProgress[]): FilmGroup[] {
  const sets = view?.screenSets ?? [];
  const bySet = new Map<string, JobSheetViewSet | null>();
  const taken = new Set<JobSheetViewSet>();

  /** The sheet's set for a pack: its own, else the first of the same name and film count not taken by another pack. */
  const setFor = (screen: ScreenProgress): JobSheetViewSet | null => {
    const known = bySet.get(screen.packId);
    if (known !== undefined) return known;
    let found: JobSheetViewSet | null = sets.find((set) => set.packId !== null && set.packId === screen.packId) ?? null;
    if (!found) {
      const count = filmCountOf(screen.position);
      found = sets.find((set) => !taken.has(set) && set.packId === null && set.setName === screen.setName && (count === null || set.screens === count)) ?? sets.find((set) => !taken.has(set) && set.setName === screen.setName && (count === null || set.screens === count)) ?? null;
    }
    if (found) taken.add(found);
    bySet.set(screen.packId, found);
    return found;
  };

  const groups = new Map<string, FilmGroup>();
  for (const screen of screens) {
    const set = setFor(screen);
    let group = groups.get(screen.packId);
    if (!group) {
      group = { key: screen.packId, setName: screen.setName, set, rows: [] };
      groups.set(screen.packId, group);
    }
    group.rows.push({ screen, film: set?.films.find((f) => f.index === screen.filmNumber) ?? null });
  }
  return [...groups.values()].map((group) => ({ ...group, rows: [...group.rows].sort((a, b) => a.screen.filmNumber - b.screen.filmNumber) }));
}
