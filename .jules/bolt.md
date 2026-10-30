
## 2026-06-28 - [O(N) Single-Pass KPI Aggregation]
**Learning:** Found an anti-pattern in `Reports.jsx` where ~20 separate `.filter()` and `.reduce()` passes were performed on every render for invoices and SAT orders.
**Action:** Consolidate multiple metrics into a single-pass loop and wrap in `useMemo`. This reduces complexity from O(N * K) to O(N) and prevents UI lag during tab switches.
