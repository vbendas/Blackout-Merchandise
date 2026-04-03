# Design: Waitlist Position Query Optimization

## Context

Currently, `getWaitlistPosition` loads all waitlist entries into memory:

```typescript
const allEntries = await db.select().from(waitlist).orderBy(waitlist.timestamp);
const position = allEntries.findIndex((entry) => entry.email === email);
```

This is O(n) memory and O(n) time complexity.

## Goals / Non-Goals

**Goals:**
- Calculate waitlist position using a single SQL COUNT query
- Return null for non-existent emails
- Maintain same API signature (same input/output types)

**Non-Goals:**
- Caching positions (future optimization)
- Bulk position lookups (out of scope)

## Decisions

### Decision 1: Use SQL COUNT with WHERE clause

The new implementation will use:

```typescript
const [result] = await db
  .select({ count: count() })
  .from(waitlist)
  .where(lt(waitlist.timestamp, userEntry.timestamp));

return result ? result.count + 1 : null;
```

**Rationale:** This transfers only the count value from the database, not all rows. It's O(1) memory and typically O(log n) or O(1) time depending on indexing.
