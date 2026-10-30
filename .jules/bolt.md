## 2025-05-15 - [O(1) Calendar Lookups]
**Learning:** Calendar components that iterate through cells (days/hours) and filter a large dataset for each cell create O(Cells * Items) performance bottlenecks, leading to severe UI lag during state updates (like typing in a dialog).
**Action:** Always pre-group dataset items into a lookup object or Map keyed by the cell identifier (e.g., ISO date string) in a `useMemo` hook to achieve O(1) lookup during cell rendering.
