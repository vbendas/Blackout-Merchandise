// PRINT_MOCK=1 makes the print services answer with the sample views in
// lib/print/mock-views.ts, so the Studio and admin pages can be built and
// checked without the pipeline. Never in production: there it would switch
// off the pre-press production gate and the ownership checks behind the views.
// Client-safe (no imports).

export function printMockOn(): boolean {
  return process.env.PRINT_MOCK === '1' && process.env.NODE_ENV !== 'production';
}
