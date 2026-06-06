# Bolt's Performance Journal ⚡

## 2026-06-06 - [Optimizing Reports.jsx with useMemo]
**Learning:** In pages like `Reports.jsx` that perform extensive O(N) calculations and data transformations (filtering, reducing, sorting) for charts and KPIs, these operations run on every re-render. Since `Reports.jsx` also uses `Tabs`, switching tabs triggers a re-render and recalculates everything, which is unnecessary as the data only changes when the initial fetch completes or the `period` changes.
**Action:** Use `useMemo` to wrap all heavy data processing logic, including nested list operations and IIFEs inside JSX, with `data` and `period` as dependencies.
