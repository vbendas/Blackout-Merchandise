#!/usr/bin/env node
// STUB (WP1). Filled by WP3 (and extended by WP4/WP6b).
//
// Contract (plan 11.10): after `npm run build`, assert .next has no /dev/*
// route and no GC Grind font file unless design-tokens/LICENCES.md records the
// licence; with `npm run start` running, /dev/specimen and /dev/styleguide
// must return 404 unless SPECIMEN=1.
//
//   node scripts/verify/prod-guard.mjs [--base http://localhost:3000]
console.log('prod-guard: not implemented yet (WP3 fills this in); passing.');
process.exit(0);
