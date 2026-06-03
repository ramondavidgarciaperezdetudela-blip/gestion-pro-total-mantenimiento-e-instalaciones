# Bolt's Performance Journal

## 2025-05-15 - Memoization of heavy reports
**Learning:** Large data aggregation pages (like Reports, Documents, Inventory) in this codebase often perform multiple O(N) operations (filter, reduce, map) directly in the render body. This causes significant UI lag when the component re-renders for any reason (e.g., state updates, parent renders).
**Action:** Always wrap KPI aggregations and chart data transformations in `useMemo`. Ensure dependencies include both the raw data and any filter criteria (like `period` or `search`).

## 2025-05-15 - Redundant filtering in ticketMedio
**Learning:** Avoid double-filtering the same array for derived stats.
**Action:** Filter once to get the subset (e.g., `facturasWithTotal`) and then use its length or reduce it, rather than calling `.filter(...).length` and then `.filter(...).reduce(...)` separately.
