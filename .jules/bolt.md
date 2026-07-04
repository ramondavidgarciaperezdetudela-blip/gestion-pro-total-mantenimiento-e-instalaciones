## 2026-07-04 - Type Safety with React.memo in JSX
**Learning:** In this repository's configuration, using `React.memo` on components in `.jsx` files often causes `tsc` to fail with "Property does not exist on type '{}'" when props are destructured.
**Action:** Use JSDoc `@param` annotations to explicitly define prop types for memoized components to maintain type safety and avoid build regressions.
