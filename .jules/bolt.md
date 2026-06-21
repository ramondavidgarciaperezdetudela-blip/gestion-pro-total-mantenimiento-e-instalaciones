## 2025-05-15 - [React Hooks Placement]
**Learning:** React hooks (like `useMemo`) must always be called at the top level of a component, never inside JSX or return statements, to maintain hook order and stability.
**Action:** Always place `useMemo`, `useCallback`, and other hooks at the top of the component function body.

## 2025-05-15 - [useMemo with Date Dependencies]
**Learning:** When memoizing calculations that depend on the current time (e.g., "7 days ago"), the value remains stale until the primary dependencies change.
**Action:** If real-time accuracy is needed across date boundaries, consider including a "today" string or similar time-based dependency in the `useMemo` dependency array.
