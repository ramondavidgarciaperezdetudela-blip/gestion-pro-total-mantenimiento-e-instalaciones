## 2025-05-25 - [O(N^2) Grouping in PriceComparator]
**Learning:** The `buildComparisons` function had $O(N^2)$ complexity with expensive string operations (split, filter, toLowerCase) inside the nested loops. For datasets over 2000 items, this resulted in execution times > 170ms, blocking the main thread during render.
**Action:** Always pre-process strings and tokenize words in an $O(N)$ pass before entering $O(N^2)$ comparison loops. Use a `Map` for exact matches to reduce the number of items that require expensive fuzzy matching.
