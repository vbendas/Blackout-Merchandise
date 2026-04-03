# Proposal: Optimize Waitlist Position Query

## Why

The `getWaitlistPosition` function in `src/db/waitlist.ts` is inefficient. It loads ALL waitlist entries into memory and calculates position using JavaScript array operations. This doesn't scale—as the waitlist grows, response times degrade and memory usage increases.

## What Changes

Replace the JavaScript-based position calculation with an efficient SQL COUNT query that counts entries with earlier timestamps.

## Capabilities

### Modified Capabilities

- `getWaitlistPosition(email)`: Now uses SQL COUNT instead of loading all entries

## Impact

- `src/db/waitlist.ts`: Refactor `getWaitlistPosition` function (~10 lines)
