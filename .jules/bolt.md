# Bolt Performance Journal ⚡

## 2025-05-22 - [Documents Page Optimization]
**Learning:** In pages displaying large datasets (like Documents or Inventory), filtering and KPI aggregations (e.g., `reduce` for totals) that run on every render can cause UI lag, especially when typing in search fields or filling out forms.
**Action:** Wrap complex filtering logic and financial KPI calculations in `useMemo`. This ensures these O(N) operations only re-run when the source data (`docs`) or the relevant filter state changes, keeping the UI responsive during other state updates.
