## 2025-05-15 - [O(N^2) Bottleneck in Price Comparison]
**Learning:** The `buildComparisons` function was performing heavy string operations (normalization, tokenization) within nested loops, leading to O(N^2) complexity with a very high constant factor. This caused significant UI lag with 5000+ items.
**Action:** Always hoist string processing and normalization out of comparison loops. Use `Map` for O(1) exact matching before falling back to fuzzy matching to reduce the number of expensive similarity checks.
