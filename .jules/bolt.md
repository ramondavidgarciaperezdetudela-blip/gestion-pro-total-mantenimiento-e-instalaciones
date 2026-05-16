## 2025-05-15 - [React List Rendering Optimization]
**Learning:** Defining sub-components inside the parent render body causes them to be recreated on every parent render, leading to full unmounting and remounting of the DOM elements. This is especially impactful in large lists or pages with complex state (like forms).
**Action:** Always define sub-components outside the parent or in separate files. Use `React.memo` for list items and `useCallback`/`useMemo` for props to ensure stable references and avoid unnecessary re-renders.
