# Plan: Fix Logo Path in Navigation

## Problem

The logo in the navigation menu is not loading because it's referencing `/logo/full.png` but the actual file is `short.png` in the public directory.

## Current State
- File: `/Users/victorbendas/Documents/GitHub/Merch-From/mainpage/src/components/layout/navbar.tsx`
- Line 89: `src="/logo/full.png"`
- Actual file exists: `/Users/victorbendas/Documents/GitHub/Merch-From/mainpage/public/logo/short.png`

## Solution
Replace the logo source path from `/logo/full.png` to `/logo/short.png` on line 89 of the navbar component.

## Files to Modify
- `mainpage/src/components/layout/navbar.tsx` - Change line 89

## Verification
After the change, the logo should load correctly in the navigation menu.

## Acceptance Criteria
- Logo displays properly in the navigation menu
- Uses the short.png version as specified
- No broken image links

## Risk Assessment
Low risk - simple string replacement in a single file.