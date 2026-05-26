
## 2025-05-22 - [Optimized Price Comparison Logic]
**Learning:** High-complexity render logic (like O(N*S) or O(N*ID)) in components handling large datasets (2000+ items) causes significant UI lag. Nesting `.flatMap()`, `.find()`, or expensive string operations inside loops/memos is a common bottleneck.
**Action:** Use a `Map` for O(1) metadata lookups and pre-process/normalize data (tokenization, lowercase) outside of hot loops to reduce complexity to O(N + S).
