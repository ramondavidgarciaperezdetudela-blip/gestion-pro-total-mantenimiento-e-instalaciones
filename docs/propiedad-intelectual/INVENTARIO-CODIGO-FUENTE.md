# Inventario de código fuente

> Listado de ficheros de código fuente que componen el programa, a efectos del
> depósito en el Registro de la Propiedad Intelectual. Generado automáticamente
> a partir del control de versiones (Git).

**Versión:** 1.33.0  
**Fecha de generación:** 22/08/2026  
**Identificador de la revisión (commit):** `deb068f39a86be3f19bd9c888cf3a394f1675d03`

## Resumen

| Concepto | Valor |
|---|---|
| Ficheros fuente (src + configuración + scripts) | 326 |
| Líneas de código (JS/JSX/CSS en src) | 79.008 |
| Páginas funcionales | 69 |
| Componentes | 167 |
| Librerías propias | 45 |
| Lenguajes | JavaScript, JSX, HTML, CSS, Python |
| Sistema de construcción | Vite 6 · Electron · Capacitor |

## Estructura de directorios

```
  167  src/components
   69  src/pages
   45  src/lib
    2  src/hooks
    1  src/App.jsx
    1  src/Layout.jsx
    1  src/api
    1  src/index.css
    1  src/main.jsx
    1  src/pages.config.js
```

## Listado completo de ficheros fuente

| # | Fichero | Líneas |
|---|---|---|
| 1 | `.github/workflows/build-apk.yml` | 142 |
| 2 | `.github/workflows/build-desktop.yml` | 88 |
| 3 | `.github/workflows/build-playstore-aab.yml` | 104 |
| 4 | `.github/workflows/node.js.yml` | 31 |
| 5 | `.github/workflows/release-publica.yml` | 175 |
| 6 | `capacitor.config.json` | 11 |
| 7 | `components.json` | 21 |
| 8 | `electron-builder.yml` | 102 |
| 9 | `electron/main.cjs` | 309 |
| 10 | `electron/preload.cjs` | 40 |
| 11 | `eslint.config.js` | 60 |
| 12 | `herramientas/Subir-Nueva-Version.html` | 318 |
| 13 | `index.html` | 126 |
| 14 | `jsconfig.json` | 21 |
| 15 | `movil-expo/App.js` | 70 |
| 16 | `movil-expo/app.json` | 16 |
| 17 | `movil-expo/package.json` | 20 |
| 18 | `package.json` | 120 |
| 19 | `postcss.config.js` | 6 |
| 20 | `public/legal/eula.html` | 50 |
| 21 | `public/legal/privacidad.html` | 50 |
| 22 | `public/legal/terminos.html` | 42 |
| 23 | `public/manifest.json` | 45 |
| 24 | `public/sw.js` | 82 |
| 25 | `scripts/anadir-guardar-como.py` | 240 |
| 26 | `scripts/firmar-apk-con-clave-fija.py` | 64 |
| 27 | `scripts/gen-mapa-distribucion.py` | 111 |
| 28 | `scripts/gen-video-comercial.py` | 255 |
| 29 | `scripts/gen-video-corto-vertical.py` | 135 |
| 30 | `scripts/gen-video-realista-vertical.py` | 115 |
| 31 | `scripts/gen-video-realista.py` | 129 |
| 32 | `scripts/generar-codigos-postales.py` | 164 |
| 33 | `scripts/inline-offline.mjs` | 21 |
| 34 | `scripts/verificar-firma-apk.py` | 119 |
| 35 | `src/App.jsx` | 168 |
| 36 | `src/Layout.jsx` | 483 |
| 37 | `src/api/base44Client.js` | 182 |
| 38 | `src/components/ACSystemDiagram.jsx` | 84 |
| 39 | `src/components/AIChat.jsx` | 195 |
| 40 | `src/components/AdvancedPriceSearch.jsx` | 157 |
| 41 | `src/components/AgendaDayMap.jsx` | 146 |
| 42 | `src/components/AgendaPanel.jsx` | 151 |
| 43 | `src/components/AutomationStatus.jsx` | 40 |
| 44 | `src/components/AvisoServidor.jsx` | 41 |
| 45 | `src/components/BackupProgressIndicator.jsx` | 30 |
| 46 | `src/components/BatteryWiringDiagram.jsx` | 151 |
| 47 | `src/components/BotonHerramienta.jsx` | 65 |
| 48 | `src/components/CameraCapture.jsx` | 240 |
| 49 | `src/components/CapillarySchematic.jsx` | 89 |
| 50 | `src/components/ChangeLogger.jsx` | 28 |
| 51 | `src/components/ChangeOpinionAlerts.jsx` | 94 |
| 52 | `src/components/CharacterMap.jsx` | 313 |
| 53 | `src/components/CityAutocomplete.jsx` | 139 |
| 54 | `src/components/ClientHistorySection.jsx` | 111 |
| 55 | `src/components/ClientMachineTab.jsx` | 354 |
| 56 | `src/components/ClientRepairGallery.jsx` | 187 |
| 57 | `src/components/CodigosAveriaSplit.jsx` | 297 |
| 58 | `src/components/ColdRoomCycleDiagram.jsx` | 81 |
| 59 | `src/components/ColdRoomHumidityCalc.jsx` | 565 |
| 60 | `src/components/CompanyHeader.jsx` | 37 |
| 61 | `src/components/ComparatorToBudgetDialog.jsx` | 275 |
| 62 | `src/components/DiagnosticFailuresDiagram.jsx` | 78 |
| 63 | `src/components/DocumentsStatusPanel.jsx` | 54 |
| 64 | `src/components/DownloadExcelTemplate.jsx` | 101 |
| 65 | `src/components/EmojiPicker.jsx` | 276 |
| 66 | `src/components/EquipmentDiaryTab.jsx` | 515 |
| 67 | `src/components/EquipmentSelector.jsx` | 363 |
| 68 | `src/components/ErrorBoundary.jsx` | 54 |
| 69 | `src/components/EsquemaCircuito.jsx` | 240 |
| 70 | `src/components/EsquemaSplit.jsx` | 249 |
| 71 | `src/components/FloatingEmojiButton.jsx` | 105 |
| 72 | `src/components/FontSelector.jsx` | 141 |
| 73 | `src/components/GasSupplierPortal.jsx` | 548 |
| 74 | `src/components/GlobalSearch.jsx` | 370 |
| 75 | `src/components/InstallationHistoryTab.jsx` | 201 |
| 76 | `src/components/InterventionHistoryTab.jsx` | 271 |
| 77 | `src/components/InvoicePreviewDialog.jsx` | 443 |
| 78 | `src/components/LegalDocSignaturePanel.jsx` | 376 |
| 79 | `src/components/LeyendaPlano.jsx` | 113 |
| 80 | `src/components/LicenseGate.jsx` | 246 |
| 81 | `src/components/LineTemplateManager.jsx` | 632 |
| 82 | `src/components/LogoFetcher.jsx` | 53 |
| 83 | `src/components/MaterialAutocomplete.jsx` | 219 |
| 84 | `src/components/MaterialsExportButton.jsx` | 172 |
| 85 | `src/components/MissingSATSignatures.jsx` | 42 |
| 86 | `src/components/MobileDrawerSelect.jsx` | 93 |
| 87 | `src/components/MobileKPIView.jsx` | 172 |
| 88 | `src/components/MobileSelect.jsx` | 103 |
| 89 | `src/components/MollierDiagram.jsx` | 474 |
| 90 | `src/components/MonthlyRevenueChart.jsx` | 184 |
| 91 | `src/components/NavBar.jsx` | 49 |
| 92 | `src/components/NetworkStatus.jsx` | 58 |
| 93 | `src/components/NotificationsPanel.jsx` | 202 |
| 94 | `src/components/OfflineSyncBanner.jsx` | 89 |
| 95 | `src/components/PaletaEquipos.jsx` | 129 |
| 96 | `src/components/PantallaArranque.jsx` | 113 |
| 97 | `src/components/PendingSignaturesPanel.jsx` | 216 |
| 98 | `src/components/PendingTasksPanel.jsx` | 189 |
| 99 | `src/components/PhotoGallery.jsx` | 259 |
| 100 | `src/components/PhotoInput.jsx` | 178 |
| 101 | `src/components/PhotosWithNames.jsx` | 87 |
| 102 | `src/components/PostalCodeSearch.jsx` | 118 |
| 103 | `src/components/PriceComparator.jsx` | 432 |
| 104 | `src/components/PriceItemSelector.jsx` | 266 |
| 105 | `src/components/PrintButton.jsx` | 191 |
| 106 | `src/components/ProductPriceHistoryChart.jsx` | 193 |
| 107 | `src/components/ProtectedRoute.jsx` | 37 |
| 108 | `src/components/PullToRefresh.jsx` | 104 |
| 109 | `src/components/QuickPriceDBAccess.jsx` | 314 |
| 110 | `src/components/RefrigerantGuide.jsx` | 251 |
| 111 | `src/components/RefrigerantMaintenanceAlert.jsx` | 223 |
| 112 | `src/components/RefrigerantReport.jsx` | 302 |
| 113 | `src/components/RefrigerantSelector.jsx` | 193 |
| 114 | `src/components/SATKanban.jsx` | 155 |
| 115 | `src/components/SATOrderDialog.jsx` | 537 |
| 116 | `src/components/SATSharePanel.jsx` | 74 |
| 117 | `src/components/SATSignaturePanel.jsx` | 232 |
| 118 | `src/components/SATTechReport.jsx` | 353 |
| 119 | `src/components/SATTemplateSelector.jsx` | 335 |
| 120 | `src/components/SectionBackground.jsx` | 48 |
| 121 | `src/components/SendDocumentEmailPanel.jsx` | 141 |
| 122 | `src/components/SignatureHistoryViewer.jsx` | 97 |
| 123 | `src/components/SignaturePad.jsx` | 223 |
| 124 | `src/components/SolarWiringDiagram.jsx` | 156 |
| 125 | `src/components/StorageSetupNotice.jsx` | 108 |
| 126 | `src/components/SupplierCatalogImport.jsx` | 408 |
| 127 | `src/components/SupplierCatalogImportWithSupplier.jsx` | 1052 |
| 128 | `src/components/SupplierCatalogManager.jsx` | 230 |
| 129 | `src/components/SupplierDataFetcher.jsx` | 75 |
| 130 | `src/components/SupplierOnlineUpdate.jsx` | 1261 |
| 131 | `src/components/SupplierPriceManager.jsx` | 356 |
| 132 | `src/components/SupplierProductQuery.jsx` | 257 |
| 133 | `src/components/SupplierProductSearch.jsx` | 184 |
| 134 | `src/components/TechnicianSelect.jsx` | 66 |
| 135 | `src/components/ThemeToggle.jsx` | 25 |
| 136 | `src/components/ThermalCalcViewer.jsx` | 314 |
| 137 | `src/components/ThermalCharts.jsx` | 217 |
| 138 | `src/components/TipoDeFuentePanel.jsx` | 181 |
| 139 | `src/components/UpdateChecker.jsx` | 322 |
| 140 | `src/components/UpdateErrorsTable.jsx` | 454 |
| 141 | `src/components/UserNotRegisteredError.jsx` | 31 |
| 142 | `src/components/ValidCharsConfig.jsx` | 194 |
| 143 | `src/components/Vista3DPlano.jsx` | 273 |
| 144 | `src/components/autoNumber.jsx` | 26 |
| 145 | `src/components/refrigerantData.jsx` | 335 |
| 146 | `src/components/solar/AIReportPanel.jsx` | 94 |
| 147 | `src/components/solar/ClientSparePartsTab.jsx` | 269 |
| 148 | `src/components/solar/InverterComparison.jsx` | 305 |
| 149 | `src/components/solar/MontajeIlustration.jsx` | 160 |
| 150 | `src/components/solar/PVGISReport.jsx` | 1435 |
| 151 | `src/components/solar/SolarPVGISCalc.jsx` | 448 |
| 152 | `src/components/solar/SolarSiteReport.jsx` | 465 |
| 153 | `src/components/solar/SolarSparePartsTab.jsx` | 209 |
| 154 | `src/components/solar/SupplierPriceLookup.jsx` | 79 |
| 155 | `src/components/ui/accordion.jsx` | 41 |
| 156 | `src/components/ui/alert-dialog.jsx` | 97 |
| 157 | `src/components/ui/alert.jsx` | 47 |
| 158 | `src/components/ui/aspect-ratio.jsx` | 5 |
| 159 | `src/components/ui/avatar.jsx` | 35 |
| 160 | `src/components/ui/badge.jsx` | 34 |
| 161 | `src/components/ui/breadcrumb.jsx` | 92 |
| 162 | `src/components/ui/button.jsx` | 48 |
| 163 | `src/components/ui/calendar.jsx` | 71 |
| 164 | `src/components/ui/card.jsx` | 54 |
| 165 | `src/components/ui/carousel.jsx` | 193 |
| 166 | `src/components/ui/chart.jsx` | 309 |
| 167 | `src/components/ui/checkbox.jsx` | 22 |
| 168 | `src/components/ui/collapsible.jsx` | 11 |
| 169 | `src/components/ui/command.jsx` | 116 |
| 170 | `src/components/ui/context-menu.jsx` | 156 |
| 171 | `src/components/ui/dialog.jsx` | 96 |
| 172 | `src/components/ui/drawer.jsx` | 92 |
| 173 | `src/components/ui/dropdown-menu.jsx` | 156 |
| 174 | `src/components/ui/form.jsx` | 134 |
| 175 | `src/components/ui/hover-card.jsx` | 25 |
| 176 | `src/components/ui/input-otp.jsx` | 53 |
| 177 | `src/components/ui/input.jsx` | 19 |
| 178 | `src/components/ui/label.jsx` | 16 |
| 179 | `src/components/ui/menubar.jsx` | 200 |
| 180 | `src/components/ui/navigation-menu.jsx` | 104 |
| 181 | `src/components/ui/number-field.jsx` | 66 |
| 182 | `src/components/ui/pagination.jsx` | 100 |
| 183 | `src/components/ui/popover.jsx` | 27 |
| 184 | `src/components/ui/progress.jsx` | 23 |
| 185 | `src/components/ui/radio-group.jsx` | 29 |
| 186 | `src/components/ui/resizable.jsx` | 42 |
| 187 | `src/components/ui/scroll-area.jsx` | 38 |
| 188 | `src/components/ui/select.jsx` | 121 |
| 189 | `src/components/ui/separator.jsx` | 23 |
| 190 | `src/components/ui/sheet.jsx` | 109 |
| 191 | `src/components/ui/sidebar.jsx` | 626 |
| 192 | `src/components/ui/skeleton.jsx` | 14 |
| 193 | `src/components/ui/slider.jsx` | 21 |
| 194 | `src/components/ui/sonner.jsx` | 29 |
| 195 | `src/components/ui/switch.jsx` | 22 |
| 196 | `src/components/ui/table.jsx` | 86 |
| 197 | `src/components/ui/tabs.jsx` | 41 |
| 198 | `src/components/ui/textarea.jsx` | 18 |
| 199 | `src/components/ui/toast.jsx` | 104 |
| 200 | `src/components/ui/toaster.jsx` | 33 |
| 201 | `src/components/ui/toggle-group.jsx` | 44 |
| 202 | `src/components/ui/toggle.jsx` | 38 |
| 203 | `src/components/ui/tooltip.jsx` | 28 |
| 204 | `src/components/ui/use-toast.jsx` | 164 |
| 205 | `src/hooks/use-mobile.jsx` | 19 |
| 206 | `src/hooks/useHistorial.js` | 64 |
| 207 | `src/index.css` | 195 |
| 208 | `src/lib/AuthContext.jsx` | 161 |
| 209 | `src/lib/NavigationTracker.jsx` | 42 |
| 210 | `src/lib/PageNotFound.jsx` | 76 |
| 211 | `src/lib/app-params.js` | 54 |
| 212 | `src/lib/availability.js` | 276 |
| 213 | `src/lib/avisoServidor.js` | 328 |
| 214 | `src/lib/backupEngine.js` | 247 |
| 215 | `src/lib/catalogoMaquinas.js` | 201 |
| 216 | `src/lib/cerramientos.js` | 281 |
| 217 | `src/lib/codigosPostales.js` | 230 |
| 218 | `src/lib/compressImage.js` | 188 |
| 219 | `src/lib/copiasLotes.js` | 119 |
| 220 | `src/lib/cp-espana-datos.js` | 23 |
| 221 | `src/lib/dailyAutoUpdate.js` | 208 |
| 222 | `src/lib/diagnosticoClima.js` | 327 |
| 223 | `src/lib/externalStorage.js` | 142 |
| 224 | `src/lib/fonts.js` | 107 |
| 225 | `src/lib/guardarCopia.js` | 561 |
| 226 | `src/lib/homeDataCache.js` | 107 |
| 227 | `src/lib/image-search-ai.js` | 247 |
| 228 | `src/lib/informePlano.js` | 280 |
| 229 | `src/lib/license.config.js` | 42 |
| 230 | `src/lib/licenseManager.js` | 261 |
| 231 | `src/lib/offlineCache.js` | 46 |
| 232 | `src/lib/planoCalculos.js` | 637 |
| 233 | `src/lib/planoFormas.js` | 135 |
| 234 | `src/lib/planoRecorrido.js` | 302 |
| 235 | `src/lib/planoSimbolos.js` | 430 |
| 236 | `src/lib/planoVariantes.js` | 162 |
| 237 | `src/lib/plans.config.js` | 39 |
| 238 | `src/lib/plantillasCatalogo.js` | 460 |
| 239 | `src/lib/prefetch.js` | 59 |
| 240 | `src/lib/presupuestoIA.js` | 275 |
| 241 | `src/lib/printHelper.js` | 97 |
| 242 | `src/lib/query-client.js` | 14 |
| 243 | `src/lib/queryConfig.js` | 23 |
| 244 | `src/lib/sanitizeHtml.js` | 73 |
| 245 | `src/lib/saveErrorMessage.js` | 92 |
| 246 | `src/lib/tipoDeFuente.js` | 365 |
| 247 | `src/lib/uploadImage.js` | 269 |
| 248 | `src/lib/uploadPhotosSequential.js` | 50 |
| 249 | `src/lib/useDebounce.js` | 53 |
| 250 | `src/lib/useOptimisticDelete.js` | 46 |
| 251 | `src/lib/utils.js` | 9 |
| 252 | `src/lib/whatsapp.js` | 86 |
| 253 | `src/main.jsx` | 16 |
| 254 | `src/pages.config.js` | 186 |
| 255 | `src/pages/ACPlanAnalysis.jsx` | 918 |
| 256 | `src/pages/ACPotenciaCalc.jsx` | 1395 |
| 257 | `src/pages/AIAssistant.jsx` | 193 |
| 258 | `src/pages/AIBudget.jsx` | 734 |
| 259 | `src/pages/AIPlanning.jsx` | 455 |
| 260 | `src/pages/AIReports.jsx` | 400 |
| 261 | `src/pages/AISearch.jsx` | 244 |
| 262 | `src/pages/AISupport.jsx` | 228 |
| 263 | `src/pages/Agenda.jsx` | 382 |
| 264 | `src/pages/AuditLog.jsx` | 124 |
| 265 | `src/pages/Automations.jsx` | 321 |
| 266 | `src/pages/Availability.jsx` | 534 |
| 267 | `src/pages/BackupCenter.jsx` | 1342 |
| 268 | `src/pages/BatteryCalc.jsx` | 509 |
| 269 | `src/pages/BusinessCards.jsx` | 604 |
| 270 | `src/pages/CapillaryCalc.jsx` | 326 |
| 271 | `src/pages/Catalogs.jsx` | 157 |
| 272 | `src/pages/ClientPortal.jsx` | 514 |
| 273 | `src/pages/ColdRoomCalc.jsx` | 1024 |
| 274 | `src/pages/CompanyConfig.jsx` | 1332 |
| 275 | `src/pages/ContactDetail.jsx` | 1219 |
| 276 | `src/pages/ContactForm.jsx` | 98 |
| 277 | `src/pages/Contacts.jsx` | 541 |
| 278 | `src/pages/DanfossTools.jsx` | 107 |
| 279 | `src/pages/DiagnosticoCarga.jsx` | 1507 |
| 280 | `src/pages/DocumentTemplates.jsx` | 802 |
| 281 | `src/pages/Documents.jsx` | 1329 |
| 282 | `src/pages/ElectricalCalc.jsx` | 163 |
| 283 | `src/pages/EquipmentDiaryPage.jsx` | 451 |
| 284 | `src/pages/EquipmentFailureHistory.jsx` | 347 |
| 285 | `src/pages/ExportData.jsx` | 470 |
| 286 | `src/pages/GasSuppliers.jsx` | 242 |
| 287 | `src/pages/Home.jsx` | 861 |
| 288 | `src/pages/IncidentManagement.jsx` | 550 |
| 289 | `src/pages/Inventory.jsx` | 638 |
| 290 | `src/pages/LegalDocs.jsx` | 906 |
| 291 | `src/pages/LicenseActivation.jsx` | 311 |
| 292 | `src/pages/LicenseRenewal.jsx` | 134 |
| 293 | `src/pages/Maintenance.jsx` | 533 |
| 294 | `src/pages/MaintenancePlanning.jsx` | 442 |
| 295 | `src/pages/Manuals.jsx` | 613 |
| 296 | `src/pages/MultiAreaCalc.jsx` | 254 |
| 297 | `src/pages/Notes.jsx` | 253 |
| 298 | `src/pages/PlanoIA.jsx` | 2772 |
| 299 | `src/pages/PresupuestoPublico.jsx` | 712 |
| 300 | `src/pages/ProjectTimeline.jsx` | 194 |
| 301 | `src/pages/Projects.jsx` | 463 |
| 302 | `src/pages/PurchaseSummary.jsx` | 279 |
| 303 | `src/pages/RefrigerantEquiv.jsx` | 607 |
| 304 | `src/pages/Regulations.jsx` | 385 |
| 305 | `src/pages/Reports.jsx` | 399 |
| 306 | `src/pages/SAT.jsx` | 948 |
| 307 | `src/pages/SATCalendar.jsx` | 397 |
| 308 | `src/pages/SATChat.jsx` | 328 |
| 309 | `src/pages/SATPublico.jsx` | 602 |
| 310 | `src/pages/SharingWarning.jsx` | 151 |
| 311 | `src/pages/SmartReminders.jsx` | 339 |
| 312 | `src/pages/SolarBatteryCalc.jsx` | 1033 |
| 313 | `src/pages/SolarCalc.jsx` | 376 |
| 314 | `src/pages/SparePartsManager.jsx` | 18 |
| 315 | `src/pages/SupplierTariffs.jsx` | 688 |
| 316 | `src/pages/Suppliers.jsx` | 608 |
| 317 | `src/pages/TablasRefrigerantes.jsx` | 116 |
| 318 | `src/pages/TechnicianDay.jsx` | 618 |
| 319 | `src/pages/TechnicianFieldWork.jsx` | 320 |
| 320 | `src/pages/TecniciansRoutes.jsx` | 478 |
| 321 | `src/pages/ThermalCalc.jsx` | 554 |
| 322 | `src/pages/UpdateCenter.jsx` | 264 |
| 323 | `src/pages/VerificarDocumento.jsx` | 102 |
| 324 | `tailwind.config.js` | 93 |
| 325 | `vite.config.js` | 24 |
| 326 | `vite.config.offline.js` | 28 |

**Total: 326 ficheros. 82.555 líneas.**
