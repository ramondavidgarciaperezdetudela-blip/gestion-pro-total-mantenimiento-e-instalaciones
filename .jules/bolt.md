## 2024-06-02 - [Optimization: Suppliers.jsx]
**Learning:** Large list views (like `Suppliers.jsx`) often recalculate complex filters and KPI aggregations on every render, especially during high-frequency events like search typing. Consolidating multiple `.filter()` passes into a single pass and using `useMemo` significantly reduces CPU and memory overhead.
**Action:** Always memoize derived lists and consolidates array iterations in performance-critical components.

## 2024-06-02 - [Codebase Pattern: Pre-existing Type Errors]
**Learning:** The codebase contains many pre-existing type errors (e.g., missing properties in `EMPTY_FORM` in `Suppliers.jsx`). These should be ignored if they are unrelated to the current optimization task, as they might lead to scope creep.
**Action:** Focus on not introducing new regressions and only fix pre-existing errors if they directly block the optimization or are trivial to fix.
