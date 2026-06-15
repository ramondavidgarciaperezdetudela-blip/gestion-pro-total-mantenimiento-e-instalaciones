## 2025-05-15 - [List Optimization in Inventory]
**Learning:** Large list views in this app (Inventory, Documents, etc.) frequently recalculate complex O(N) filters on every render, causing UI lag during search.
**Action:** Use `useMemo` for filtered lists and `React.memo` for list item components. Ensure event handlers passed to memoized components are wrapped in `useCallback`.
