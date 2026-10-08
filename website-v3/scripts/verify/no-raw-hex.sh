#!/usr/bin/env bash
# Report raw hex colours outside the token files (WP1).
#
#   scripts/verify/no-raw-hex.sh [--warn] [--files <list-file|comma,list>]
#
# Scans website-v3/app and website-v3/components (+ lib, *.ts/*.tsx/*.css) for
# #rgb/#rrggbb/#rrggbbaa literals. Allowlist: design-tokens/**, lib/theme-colors.ts,
# opengraph-image.tsx, twitter-image.tsx, icon.tsx, apple-icon.tsx, app/dev/**.
# Report-only (--warn, the default until WP21). --strict makes hits exit 1.
# --files accepts a file containing one path per line, or a comma list, and
# checks only those paths (WPs use this for their own acceptance).
set -u
cd "$(dirname "$0")/../.." || exit 2   # website-v3/

MODE=warn
FILES=""
while [ $# -gt 0 ]; do
  case "$1" in
    --warn) MODE=warn ;;
    --strict) MODE=strict ;;
    --files) shift; FILES="${1:-}" ;;
    *) echo "unknown arg $1" >&2; exit 2 ;;
  esac
  shift
done

allowed() {
  case "$1" in
    design-tokens/*|*/design-tokens/*|lib/theme-colors.ts|*/lib/theme-colors.ts) return 0 ;;
    *opengraph-image.tsx|*twitter-image.tsx|*/icon.tsx|icon.tsx|*apple-icon.tsx) return 0 ;;
    app/dev/*|*/app/dev/*) return 0 ;;
  esac
  return 1
}

if [ -n "$FILES" ]; then
  if [ -f "$FILES" ]; then CANDIDATES=$(cat "$FILES"); else CANDIDATES=$(echo "$FILES" | tr ',' '\n'); fi
else
  CANDIDATES=$(find app components lib -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) 2>/dev/null)
fi

HITS=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  f="${f#./}"; f="${f#website-v3/}"
  [ -f "$f" ] || continue
  allowed "$f" && continue
  # #abc, #aabbcc, #aabbccdd not preceded by a word char or & (skips &#x entities, anchors and ids like #main)
  out=$(grep -nE '(^|[^[:alnum:]_&-])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})([^[:alnum:]_-]|$)' "$f" 2>/dev/null \
        | grep -vE 'href=["'"'"']#|url\(#|"#[a-z]' )
  if [ -n "$out" ]; then
    while IFS= read -r line; do echo "$f:$line"; HITS=$((HITS+1)); done <<< "$out"
  fi
done <<< "$CANDIDATES"

echo "no-raw-hex: $HITS raw hex literal(s) ($MODE)"
[ "$MODE" = strict ] && [ "$HITS" -gt 0 ] && exit 1
exit 0
