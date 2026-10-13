// Artist-facing name of a run (one bulk order). Client-safe. Runs are numbered
// per shop in the order they were created; lib/services/runs.ts computes the
// number.

/** 'Run 3' */
export function runLabel(n: number): string {
  return `Run ${n}`;
}
