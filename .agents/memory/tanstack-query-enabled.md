---
name: TanStack Query v5 enabled pattern
description: UseQueryOptions in v5 requires queryKey; passing { enabled } alone fails TS.
---

## The Problem
TanStack Query v5's `UseQueryOptions` requires `queryKey` as a mandatory property. Orval-generated hooks accept `options?: { query?: UseQueryOptions<...> }`. Passing `{ query: { enabled: boolean } }` causes:
```
Property 'queryKey' is missing in type '{ enabled: boolean; }' but required in type 'UseQueryOptions<...>'
```

## Fix
Instead of using `enabled`, pass `accountId: 0` (or a safe default) when the real ID isn't available yet, and gate display logic on state. The hook will run with the default but the component renders nothing because `selectedId === null` guards the JSX.

```tsx
const { data } = useListAccountTransactions({ accountId: selectedId ?? 0 });
// Guard display: if (selectedId === null) return <prompt>
```

**Why:** Orval-generated hooks in this workspace use the v5 form where `queryKey` is required in the options type. The `enabled` option is available inside the Orval-generated `getXxxQueryOptions()` factory but not directly passable via the hook's second argument without also providing `queryKey`.
