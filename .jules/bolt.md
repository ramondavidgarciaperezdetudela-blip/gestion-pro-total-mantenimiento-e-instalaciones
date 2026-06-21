## 2026-05-30 - Sequential API Loading Pattern
**Learning:** The codebase (e.g., Inventory.jsx) uses a sequential data loading pattern in useEffect/loadAll with manual 120ms delays between entity list calls to avoid backend rate limits (429 errors).
**Action:** When adding new data fetching logic or optimizing existing pages, respect or implement similar batching/delay patterns if multiple entity types are involved to ensure stability with large datasets.
