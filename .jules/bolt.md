## 2025-05-15 - [Optimization] Memoize Report Data Transformations

**Learning:** Report-heavy pages like `Reports.jsx` often perform expensive O(N) calculations (filtering, reducing) on large datasets for KPIs and charts. When these components use Tabs, switching tabs triggers a full re-render, re-executing these transformations even if the data hasn't changed.

**Action:** Consolidate derived stats into a single `useMemo` object with `data` and `period` as dependencies. This ensures UI responsiveness during tab transitions and state updates.
