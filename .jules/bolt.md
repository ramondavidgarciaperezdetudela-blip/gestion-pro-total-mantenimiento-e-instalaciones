## 2025-05-27 - [Documents.jsx] Memoización de filtrado y KPIs
**Learning:** En la página de Documentos, el filtrado y el cálculo de KPIs financieros (total facturado, cobrado mes, etc.) se ejecutaban en cada renderizado. Con un dataset de 5000 documentos, estas operaciones toman ~3.4ms por renderizado (basado en benchmark de 100 iteraciones).
**Action:** Aplicar `useMemo` para asegurar que estos cálculos pesados solo se ejecuten cuando cambie la lista de documentos o los filtros activos, eliminando el overhead en re-renders causados por cambios en el estado del formulario o diálogos.
