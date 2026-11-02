# Do not memo trivial primitives

**Impact:** LOW-MEDIUM

Simple boolean/number/string expressions cost less than `useMemo` dependency checks.

**Incorrect:**

```typescript
const isLoading = useMemo(
  () => query.isLoading || mutation.isPending,
  [query.isLoading, mutation.isPending]
);
```

**Correct:**

```typescript
const isLoading = query.isLoading || mutation.isPending;
```

Aligns with `spec-optimize-performance` — avoid premature memoization; add `memo`/`useMemo` only for measured hotspots.
