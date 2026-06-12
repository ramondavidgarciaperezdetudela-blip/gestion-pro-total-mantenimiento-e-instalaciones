# Inventario de código fuente

> Listado de ficheros de código fuente que componen el programa, a efectos del
> depósito en el Registro de la Propiedad Intelectual. Generado automáticamente
> a partir del control de versiones (Git).

## Resumen

| Concepto | Valor |
|---|---|
| Ficheros fuente (src + config) | 218 |
| Líneas de código (JS/JSX/CSS en src) | 53271 |
| Páginas funcionales | 51 |
| Componentes | 137 |
| Lenguajes | JavaScript, JSX, HTML, CSS |
| Sistema de construcción | Vite 6 |

## Estructura de directorios

```
  137  src/components
   51  src/pages
   10  src/lib
    2  src/docs
    1  src/utils
    1  src/pages.config.js
    1  src/main.jsx
    1  src/index.css
    1  src/hooks
    1  src/api
    1  src/Layout.jsx
    1  src/App.jsx
```

## Listado completo de ficheros fuente

| # | Fichero | Líneas |
|---|---|---|
| 1 | `eslint.config.js` | 60 |
| 2 | `index.html` | 121 |
| 3 | `postcss.config.js` | 6 |
| 4 | `src/App.jsx` | 128 |
| 5 | `src/Layout.jsx` | 360 |
| 6 | `src/api/base44Client.js` | 14 |
| 7 | `src/components/AIChat.jsx` | 194 |
| 8 | `src/components/AdvancedPriceSearch.jsx` | 156 |
| 9 | `src/components/AgendaDayMap.jsx` | 145 |
| 10 | `src/components/AgendaPanel.jsx` | 150 |
| 11 | `src/components/AutomationStatus.jsx` | 39 |
| 12 | `src/components/BatteryWiringDiagram.jsx` | 150 |
| 13 | `src/components/CameraCapture.jsx` | 239 |
| 14 | `src/components/ChangeLogger.jsx` | 27 |
| 15 | `src/components/ChangeOpinionAlerts.jsx` | 93 |
| 16 | `src/components/CityAutocomplete.jsx` | 138 |
| 17 | `src/components/ClientHistorySection.jsx` | 110 |
| 18 | `src/components/ClientMachineTab.jsx` | 346 |
| 19 | `src/components/ClientRepairGallery.jsx` | 186 |
| 20 | `src/components/ColdRoomHumidityCalc.jsx` | 564 |
| 21 | `src/components/CompanyHeader.jsx` | 36 |
| 22 | `src/components/ComparatorToBudgetDialog.jsx` | 275 |
| 23 | `src/components/DocumentsStatusPanel.jsx` | 53 |
| 24 | `src/components/DownloadExcelTemplate.jsx` | 97 |
| 25 | `src/components/EquipmentDiaryTab.jsx` | 503 |
| 26 | `src/components/EquipmentSelector.jsx` | 362 |
| 27 | `src/components/GasSupplierPortal.jsx` | 547 |
| 28 | `src/components/GlobalSearch.jsx` | 369 |
| 29 | `src/components/InstallationHistoryTab.jsx` | 200 |
| 30 | `src/components/InterventionHistoryTab.jsx` | 270 |
| 31 | `src/components/InvoicePreviewDialog.jsx` | 440 |
| 32 | `src/components/LegalDocSignaturePanel.jsx` | 375 |
| 33 | `src/components/LineTemplateManager.jsx` | 631 |
| 34 | `src/components/LogoFetcher.jsx` | 52 |
| 35 | `src/components/MaterialAutocomplete.jsx` | 218 |
| 36 | `src/components/MaterialsExportButton.jsx` | 171 |
| 37 | `src/components/MissingSATSignatures.jsx` | 41 |
| 38 | `src/components/MobileDrawerSelect.jsx` | 92 |
| 39 | `src/components/MobileKPIView.jsx` | 171 |
| 40 | `src/components/MobileSelect.jsx` | 102 |
| 41 | `src/components/MonthlyRevenueChart.jsx` | 182 |
| 42 | `src/components/NotificationsPanel.jsx` | 201 |
| 43 | `src/components/PendingSignaturesPanel.jsx` | 215 |
| 44 | `src/components/PendingTasksPanel.jsx` | 188 |
| 45 | `src/components/PhotoGallery.jsx` | 189 |
| 46 | `src/components/PhotoInput.jsx` | 189 |
| 47 | `src/components/PhotosWithNames.jsx` | 86 |
| 48 | `src/components/PostalCodeSearch.jsx` | 106 |
| 49 | `src/components/PriceComparator.jsx` | 431 |
| 50 | `src/components/PriceItemSelector.jsx` | 265 |
| 51 | `src/components/PrintButton.jsx` | 194 |
| 52 | `src/components/ProductPriceHistoryChart.jsx` | 192 |
| 53 | `src/components/ProtectedRoute.jsx` | 37 |
| 54 | `src/components/PullToRefresh.jsx` | 103 |
| 55 | `src/components/QuickPriceDBAccess.jsx` | 313 |
| 56 | `src/components/RefrigerantGuide.jsx` | 250 |
| 57 | `src/components/RefrigerantMaintenanceAlert.jsx` | 222 |
| 58 | `src/components/RefrigerantReport.jsx` | 301 |
| 59 | `src/components/RefrigerantSelector.jsx` | 192 |
| 60 | `src/components/SATKanban.jsx` | 154 |
| 61 | `src/components/SATOrderDialog.jsx` | 392 |
| 62 | `src/components/SATSharePanel.jsx` | 73 |
| 63 | `src/components/SATSignaturePanel.jsx` | 217 |
| 64 | `src/components/SATTechReport.jsx` | 352 |
| 65 | `src/components/SATTemplateSelector.jsx` | 333 |
| 66 | `src/components/SendDocumentEmailPanel.jsx` | 140 |
| 67 | `src/components/SignatureHistoryViewer.jsx` | 96 |
| 68 | `src/components/SignaturePad.jsx` | 184 |
| 69 | `src/components/SolarWiringDiagram.jsx` | 155 |
| 70 | `src/components/SupplierCatalogImport.jsx` | 376 |
| 71 | `src/components/SupplierCatalogImportWithSupplier.jsx` | 1031 |
| 72 | `src/components/SupplierCatalogManager.jsx` | 229 |
| 73 | `src/components/SupplierDataFetcher.jsx` | 74 |
| 74 | `src/components/SupplierOnlineUpdate.jsx` | 1245 |
| 75 | `src/components/SupplierPriceManager.jsx` | 359 |
| 76 | `src/components/SupplierProductQuery.jsx` | 256 |
| 77 | `src/components/SupplierProductSearch.jsx` | 183 |
| 78 | `src/components/TechnicianSelect.jsx` | 65 |
| 79 | `src/components/ThermalCalcViewer.jsx` | 313 |
| 80 | `src/components/ThermalCharts.jsx` | 216 |
| 81 | `src/components/UpdateErrorsTable.jsx` | 453 |
| 82 | `src/components/UserNotRegisteredError.jsx` | 31 |
| 83 | `src/components/ValidCharsConfig.jsx` | 193 |
| 84 | `src/components/autoNumber.jsx` | 25 |
| 85 | `src/components/refrigerantData.jsx` | 316 |
| 86 | `src/components/solar/AIReportPanel.jsx` | 93 |
| 87 | `src/components/solar/ClientSparePartsTab.jsx` | 268 |
| 88 | `src/components/solar/InverterComparison.jsx` | 304 |
| 89 | `src/components/solar/MontajeIlustration.jsx` | 159 |
| 90 | `src/components/solar/PVGISReport.jsx` | 1433 |
| 91 | `src/components/solar/SolarPVGISCalc.jsx` | 447 |
| 92 | `src/components/solar/SolarSiteReport.jsx` | 462 |
| 93 | `src/components/solar/SolarSparePartsTab.jsx` | 208 |
| 94 | `src/components/solar/SupplierPriceLookup.jsx` | 78 |
| 95 | `src/components/ui/accordion.jsx` | 41 |
| 96 | `src/components/ui/alert-dialog.jsx` | 97 |
| 97 | `src/components/ui/alert.jsx` | 47 |
| 98 | `src/components/ui/aspect-ratio.jsx` | 5 |
| 99 | `src/components/ui/avatar.jsx` | 35 |
| 100 | `src/components/ui/badge.jsx` | 34 |
| 101 | `src/components/ui/breadcrumb.jsx` | 92 |
| 102 | `src/components/ui/button.jsx` | 48 |
| 103 | `src/components/ui/calendar.jsx` | 71 |
| 104 | `src/components/ui/card.jsx` | 50 |
| 105 | `src/components/ui/carousel.jsx` | 193 |
| 106 | `src/components/ui/chart.jsx` | 309 |
| 107 | `src/components/ui/checkbox.jsx` | 22 |
| 108 | `src/components/ui/collapsible.jsx` | 11 |
| 109 | `src/components/ui/command.jsx` | 116 |
| 110 | `src/components/ui/context-menu.jsx` | 156 |
| 111 | `src/components/ui/dialog.jsx` | 96 |
| 112 | `src/components/ui/drawer.jsx` | 92 |
| 113 | `src/components/ui/dropdown-menu.jsx` | 156 |
| 114 | `src/components/ui/form.jsx` | 134 |
| 115 | `src/components/ui/hover-card.jsx` | 25 |
| 116 | `src/components/ui/input-otp.jsx` | 53 |
| 117 | `src/components/ui/input.jsx` | 19 |
| 118 | `src/components/ui/label.jsx` | 16 |
| 119 | `src/components/ui/menubar.jsx` | 200 |
| 120 | `src/components/ui/navigation-menu.jsx` | 104 |
| 121 | `src/components/ui/pagination.jsx` | 100 |
| 122 | `src/components/ui/popover.jsx` | 27 |
| 123 | `src/components/ui/progress.jsx` | 23 |
| 124 | `src/components/ui/radio-group.jsx` | 29 |
| 125 | `src/components/ui/resizable.jsx` | 42 |
| 126 | `src/components/ui/scroll-area.jsx` | 38 |
| 127 | `src/components/ui/select.jsx` | 121 |
| 128 | `src/components/ui/separator.jsx` | 23 |
| 129 | `src/components/ui/sheet.jsx` | 109 |
| 130 | `src/components/ui/sidebar.jsx` | 626 |
| 131 | `src/components/ui/skeleton.jsx` | 14 |
| 132 | `src/components/ui/slider.jsx` | 21 |
| 133 | `src/components/ui/sonner.jsx` | 29 |
| 134 | `src/components/ui/switch.jsx` | 22 |
| 135 | `src/components/ui/table.jsx` | 86 |
| 136 | `src/components/ui/tabs.jsx` | 41 |
| 137 | `src/components/ui/textarea.jsx` | 18 |
| 138 | `src/components/ui/toast.jsx` | 103 |
| 139 | `src/components/ui/toaster.jsx` | 32 |
| 140 | `src/components/ui/toggle-group.jsx` | 44 |
| 141 | `src/components/ui/toggle.jsx` | 38 |
| 142 | `src/components/ui/tooltip.jsx` | 28 |
| 143 | `src/components/ui/use-toast.jsx` | 163 |
| 144 | `src/hooks/use-mobile.jsx` | 19 |
| 145 | `src/index.css` | 134 |
| 146 | `src/lib/AuthContext.jsx` | 154 |
| 147 | `src/lib/NavigationTracker.jsx` | 41 |
| 148 | `src/lib/PageNotFound.jsx` | 74 |
| 149 | `src/lib/app-params.js` | 54 |
| 150 | `src/lib/compressImage.js` | 51 |
| 151 | `src/lib/homeDataCache.js` | 106 |
| 152 | `src/lib/offlineCache.js` | 45 |
| 153 | `src/lib/prefetch.js` | 47 |
| 154 | `src/lib/query-client.js` | 13 |
| 155 | `src/lib/utils.js` | 9 |
| 156 | `src/main.jsx` | 8 |
| 157 | `src/pages.config.js` | 153 |
| 158 | `src/pages/AIAssistant.jsx` | 192 |
| 159 | `src/pages/AIBudget.jsx` | 547 |
| 160 | `src/pages/AIPlanning.jsx` | 454 |
| 161 | `src/pages/AIReports.jsx` | 399 |
| 162 | `src/pages/AISearch.jsx` | 243 |
| 163 | `src/pages/Agenda.jsx` | 381 |
| 164 | `src/pages/AuditLog.jsx` | 123 |
| 165 | `src/pages/Automations.jsx` | 320 |
| 166 | `src/pages/BackupCenter.jsx` | 806 |
| 167 | `src/pages/BatteryCalc.jsx` | 487 |
| 168 | `src/pages/BusinessCards.jsx` | 443 |
| 169 | `src/pages/Catalogs.jsx` | 156 |
| 170 | `src/pages/ClientPortal.jsx` | 513 |
| 171 | `src/pages/ColdRoomCalc.jsx` | 708 |
| 172 | `src/pages/CompanyConfig.jsx` | 990 |
| 173 | `src/pages/ContactDetail.jsx` | 1197 |
| 174 | `src/pages/Contacts.jsx` | 531 |
| 175 | `src/pages/DocumentTemplates.jsx` | 505 |
| 176 | `src/pages/Documents.jsx` | 1164 |
| 177 | `src/pages/ElectricalCalc.jsx` | 136 |
| 178 | `src/pages/EquipmentDiaryPage.jsx` | 439 |
| 179 | `src/pages/EquipmentFailureHistory.jsx` | 345 |
| 180 | `src/pages/ExportData.jsx` | 469 |
| 181 | `src/pages/Home.jsx` | 761 |
| 182 | `src/pages/IncidentManagement.jsx` | 548 |
| 183 | `src/pages/Inventory.jsx` | 617 |
| 184 | `src/pages/LegalDocs.jsx` | 904 |
| 185 | `src/pages/Maintenance.jsx` | 545 |
| 186 | `src/pages/MaintenancePlanning.jsx` | 441 |
| 187 | `src/pages/Manuals.jsx` | 606 |
| 188 | `src/pages/Notes.jsx` | 220 |
| 189 | `src/pages/PresupuestoPublico.jsx` | 689 |
| 190 | `src/pages/ProjectTimeline.jsx` | 192 |
| 191 | `src/pages/Projects.jsx` | 461 |
| 192 | `src/pages/PurchaseSummary.jsx` | 278 |
| 193 | `src/pages/Regulations.jsx` | 384 |
| 194 | `src/pages/Reports.jsx` | 398 |
| 195 | `src/pages/SAT.jsx` | 856 |
| 196 | `src/pages/SATCalendar.jsx` | 396 |
| 197 | `src/pages/SATChat.jsx` | 301 |
| 198 | `src/pages/SATPublico.jsx` | 601 |
| 199 | `src/pages/SmartReminders.jsx` | 338 |
| 200 | `src/pages/SolarBatteryCalc.jsx` | 1011 |
| 201 | `src/pages/SolarCalc.jsx` | 346 |
| 202 | `src/pages/SparePartsManager.jsx` | 17 |
| 203 | `src/pages/SupplierTariffs.jsx` | 550 |
| 204 | `src/pages/Suppliers.jsx` | 605 |
| 205 | `src/pages/TechnicianDay.jsx` | 612 |
| 206 | `src/pages/TechnicianFieldWork.jsx` | 321 |
| 207 | `src/pages/TecniciansRoutes.jsx` | 476 |
| 208 | `src/pages/ThermalCalc.jsx` | 529 |
| 209 | `tailwind.config.js` | 88 |
| 210 | `vite.config.js` | 18 |

_Nota: se excluyen del depósito los ficheros de dependencias de terceros
(`node_modules`, `package-lock.json`) y los artefactos de compilación (`dist`)._
