## 2025-06-07 - [Memoizing derived inventory lists]
**Learning:** List-heavy pages in this application (Inventory, Contacts, SAT, etc.) often recalculate complex filters and KPI aggregations on every render. This becomes a bottleneck as the dataset grows or when unrelated UI state (like Dialogs) toggles frequently.
**Action:** Always use `useMemo` for derived data lists and stats objects in pages with large datasets to ensure UI responsiveness during state updates.
