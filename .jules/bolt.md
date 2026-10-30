## 2026-05-24 - [Optimize supplierCols in PriceComparator]
**Learning:** In PriceComparator.jsx, calculating unique suppliers from a filtered list of groups was done using nested .find() and .flatMap() inside a useMemo. This resulted in O(S * N) complexity, which is inefficient for large datasets.
**Action:** Used Map for O(1) lookups of supplier metadata and performed a single pass over the filtered results to collect unique supplier IDs. This reduces complexity to O(N + S), significantly improving performance for large product catalogs with many suppliers.
