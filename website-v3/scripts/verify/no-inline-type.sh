#!/usr/bin/env bash
# Report inline typography in TSX (WP1): style objects or attributes that set
# fontFamily, fontSize, letterSpacing (and fontWeight/lineHeight, informational).
#
#   scripts/verify/no-inline-type.sh [--warn|--strict] [--files <list-file|comma,list>] [--counts]
#
# Report-only until WP21. Typography must come from .t-* classes. --counts prints
# a per-file tally (use it to record before/after numbers in a WP).
set -u
cd "$(dirname "$0")/../.." || exit 2

MODE=warn
FILES=""
COUNTS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --warn) MODE=warn ;;
    --strict) MODE=strict ;;
    --counts) COUNTS=1 ;;
    --files) shift; FILES="${1:-}" ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
  shift
done

if [ -n "$FILES" ]; then
  if [ -f "$FILES" ]; then CANDIDATES=$(cat "$FILES"); else CANDIDATES=$(echo "$FILES" | tr ',' '\n'); fi
else
  CANDIDATES=$(find app components -type f -name '*.tsx' 2>/dev/null | grep -v '^app/dev/')
fi

PATTERN='(fontFamily|fontSize|letterSpacing|font-family|font-size|letter-spacing)[[:space:]]*[:=]'
HITS=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  f="${f#./}"; f="${f#website-v3/}"
  [ -f "$f" ] || continue
  case "$f" in app/dev/*|*opengraph-image.tsx|*twitter-image.tsx|*/icon.tsx|*apple-icon.tsx) continue ;; esac
  n=$(grep -cE "$PATTERN" "$f" 2>/dev/null); n=${n:-0}
  [ "$n" -eq 0 ] && continue
  HITS=$((HITS+n))
  if [ "$COUNTS" -eq 1 ]; then echo "$n $f"; else grep -nE "$PATTERN" "$f" | sed "s|^|$f:|"; fi
done <<< "$CANDIDATES"

echo "no-inline-type: $HITS inline typography site(s) ($MODE)"
[ "$MODE" = strict ] && [ "$HITS" -gt 0 ] && exit 1
exit 0
