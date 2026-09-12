# Inventario de código fuente

> Listado de ficheros de código fuente que componen el programa, a efectos del
> depósito en el Registro de la Propiedad Intelectual. Generado automáticamente
> a partir del control de versiones (Git).

**Versión:** 1.63.0  
**Fecha de generación:** 31/08/2026  
**Identificador de la revisión (commit):** `dbd8a8e3dde2a0214b556a5737dab3c1ea3cbcad`

## Resumen

| Concepto | Valor |
|---|---|
| Ficheros fuente (src + configuración + scripts) | 381 |
| Líneas de código (JS/JSX/CSS en src) | 94.365 |
| Páginas funcionales | 71 |
| Componentes | 189 |
| Librerías propias | 71 |
| Lenguajes | JavaScript, JSX, HTML, CSS, Python |
| Sistema de construcción | Vite 6 · Electron · Capacitor |

## Estructura de directorios

```
  189  src/components
   71  src/lib
   71  src/pages
    2  src/hooks
    1  src/App.jsx
    1  src/Layout.jsx
    1  src/api
    1  src/fuentes.css
    1  src/index.css
    1  src/main.jsx
    1  src/pages.config.js
```

## Listado completo de ficheros fuente

| # | Fichero | Líneas |
|---|---|---|
| 1 | `.github/workflows/build-apk.yml` | 148 |
| 2 | `.github/workflows/build-desktop.yml` | 100 |
| 3 | `.github/workflows/build-playstore-aab.yml` | 104 |
| 4 | `.github/workflows/limpiar-releases-publicas.yml` | 96 |
| 5 | `.github/workflows/node.js.yml` | 31 |
| 6 | `.github/workflows/release-publica.yml` | 220 |
| 7 | `capacitor.config.json` | 11 |
| 8 | `components.json` | 21 |
| 9 | `electron-builder.yml` | 102 |
| 10 | `electron/main.cjs` | 617 |
| 11 | `electron/preload.cjs` | 66 |
| 12 | `eslint.config.js` | 60 |
| 13 | `herramientas/Subir-Nueva-Version.html` | 318 |
| 14 | `index.html` | 200 |
| 15 | `jsconfig.json` | 21 |
| 16 | `movil-expo/App.js` | 70 |
| 17 | `movil-expo/app.json` | 16 |
| 18 | `movil-expo/package.json` | 20 |
| 19 | `package.json` | 120 |
| 20 | `postcss.config.js` | 6 |
| 21 | `public/legal/eula.html` | 50 |
| 22 | `public/legal/privacidad.html` | 50 |
| 23 | `public/legal/terminos.html` | 42 |
| 24 | `public/manifest.json` | 45 |
| 25 | `public/sw.js` | 171 |
| 26 | `scripts/anadir-guardar-como.py` | 240 |
| 27 | `scripts/firmar-apk-con-clave-fija.py` | 64 |
| 28 | `scripts/gen-css-fuentes.py` | 54 |
| 29 | `scripts/gen-inventario-fuente.py` | 89 |
| 30 | `scripts/gen-mapa-distribucion.py` | 111 |
| 31 | `scripts/gen-video-comercial.py` | 255 |
| 32 | `scripts/gen-video-corto-vertical.py` | 135 |
| 33 | `scripts/gen-video-realista-vertical.py` | 115 |
| 34 | `scripts/gen-video-realista.py` | 129 |
| 35 | `scripts/generar-codigos-postales.py` | 164 |
| 36 | `scripts/inline-offline.mjs` | 21 |
| 37 | `scripts/permitir-ia-en-red-local.py` | 83 |
| 38 | `scripts/verificar-firma-apk.py` | 119 |
| 39 | `src/App.jsx` | 185 |
| 40 | `src/Layout.jsx` | 495 |
| 41 | `src/api/base44Client.js` | 358 |
| 42 | `src/components/ACSystemDiagram.jsx` | 84 |
| 43 | `src/components/AIChat.jsx` | 195 |
| 44 | `src/components/AdvancedPriceSearch.jsx` | 157 |
| 45 | `src/components/AgendaDayMap.jsx` | 146 |
| 46 | `src/components/AgendaPanel.jsx` | 151 |
| 47 | `src/components/AjusteRapidoLetra.jsx` | 47 |
| 48 | `src/components/AjustesProveedorIA.jsx` | 235 |
| 49 | `src/components/AutomationStatus.jsx` | 40 |
| 50 | `src/components/AvisoRecuperado.jsx` | 56 |
| 51 | `src/components/AvisoServidor.jsx` | 60 |
| 52 | `src/components/BackupProgressIndicator.jsx` | 30 |
| 53 | `src/components/BarraNavegacion.jsx` | 56 |
| 54 | `src/components/BatteryWiringDiagram.jsx` | 151 |
| 55 | `src/components/BotonHerramienta.jsx` | 65 |
| 56 | `src/components/BotonImprimirCliente.jsx` | 43 |
| 57 | `src/components/BuscadorCliente.jsx` | 197 |
| 58 | `src/components/BuscarFichaTecnica.jsx` | 191 |
| 59 | `src/components/BuscarOllama.jsx` | 103 |
| 60 | `src/components/CameraCapture.jsx` | 240 |
| 61 | `src/components/CapillarySchematic.jsx` | 89 |
| 62 | `src/components/CargaDeGas.jsx` | 267 |
| 63 | `src/components/ChangeLogger.jsx` | 28 |
| 64 | `src/components/ChangeOpinionAlerts.jsx` | 94 |
| 65 | `src/components/CharacterMap.jsx` | 313 |
| 66 | `src/components/CityAutocomplete.jsx` | 139 |
| 67 | `src/components/ClientHistorySection.jsx` | 111 |
| 68 | `src/components/ClientMachineTab.jsx` | 354 |
| 69 | `src/components/ClientRepairGallery.jsx` | 187 |
| 70 | `src/components/CodigosAveriaSplit.jsx` | 297 |
| 71 | `src/components/ColdRoomCycleDiagram.jsx` | 81 |
| 72 | `src/components/ColdRoomHumidityCalc.jsx` | 565 |
| 73 | `src/components/CompanyHeader.jsx` | 37 |
| 74 | `src/components/ComparatorToBudgetDialog.jsx` | 275 |
| 75 | `src/components/CompletarDatosEmpresa.jsx` | 191 |
| 76 | `src/components/CroquisInstalacion.jsx` | 362 |
| 77 | `src/components/DiagnosticFailuresDiagram.jsx` | 78 |
| 78 | `src/components/DocumentsStatusPanel.jsx` | 54 |
| 79 | `src/components/DownloadExcelTemplate.jsx` | 101 |
| 80 | `src/components/ElegirImpresora.jsx` | 144 |
| 81 | `src/components/ElegirTema.jsx` | 68 |
| 82 | `src/components/EmojiPicker.jsx` | 276 |
| 83 | `src/components/EnviarCopiaFirmada.jsx` | 79 |
| 84 | `src/components/EquipmentDiaryTab.jsx` | 515 |
| 85 | `src/components/EquipmentSelector.jsx` | 408 |
| 86 | `src/components/ErrorBoundary.jsx` | 54 |
| 87 | `src/components/EsquemaCircuito.jsx` | 240 |
| 88 | `src/components/EsquemaSplit.jsx` | 249 |
| 89 | `src/components/FloatingEmojiButton.jsx` | 105 |
| 90 | `src/components/FontSelector.jsx` | 141 |
| 91 | `src/components/GasSupplierPortal.jsx` | 548 |
| 92 | `src/components/GlobalSearch.jsx` | 370 |
| 93 | `src/components/GuardarDocumentacion.jsx` | 145 |
| 94 | `src/components/InspeccionSanitaria.jsx` | 207 |
| 95 | `src/components/InstallationHistoryTab.jsx` | 201 |
| 96 | `src/components/InterruptorIA.jsx` | 95 |
| 97 | `src/components/InterventionHistoryTab.jsx` | 271 |
| 98 | `src/components/InvoicePreviewDialog.jsx` | 443 |
| 99 | `src/components/LegalDocSignaturePanel.jsx` | 376 |
| 100 | `src/components/LeyendaPlano.jsx` | 113 |
| 101 | `src/components/LicenseGate.jsx` | 246 |
| 102 | `src/components/LineTemplateManager.jsx` | 632 |
| 103 | `src/components/LogoFetcher.jsx` | 53 |
| 104 | `src/components/MaterialAutocomplete.jsx` | 219 |
| 105 | `src/components/MaterialsExportButton.jsx` | 172 |
| 106 | `src/components/MissingSATSignatures.jsx` | 42 |
| 107 | `src/components/MobileDrawerSelect.jsx` | 93 |
| 108 | `src/components/MobileKPIView.jsx` | 172 |
| 109 | `src/components/MobileSelect.jsx` | 103 |
| 110 | `src/components/MollierDiagram.jsx` | 474 |
| 111 | `src/components/MonthlyRevenueChart.jsx` | 184 |
| 112 | `src/components/NavBar.jsx` | 49 |
| 113 | `src/components/NetworkStatus.jsx` | 58 |
| 114 | `src/components/NotificationsPanel.jsx` | 202 |
| 115 | `src/components/OfflineSyncBanner.jsx` | 89 |
| 116 | `src/components/PaletaEquipos.jsx` | 129 |
| 117 | `src/components/PanelGasesFluorados.jsx` | 321 |
| 118 | `src/components/PantallaArranque.jsx` | 113 |
| 119 | `src/components/PendingSignaturesPanel.jsx` | 216 |
| 120 | `src/components/PendingTasksPanel.jsx` | 189 |
| 121 | `src/components/PhotoGallery.jsx` | 259 |
| 122 | `src/components/PhotoInput.jsx` | 178 |
| 123 | `src/components/PhotosWithNames.jsx` | 87 |
| 124 | `src/components/PostalCodeSearch.jsx` | 185 |
| 125 | `src/components/PrepararIA.jsx` | 284 |
| 126 | `src/components/PriceComparator.jsx` | 432 |
| 127 | `src/components/PriceItemSelector.jsx` | 266 |
| 128 | `src/components/PrintButton.jsx` | 193 |
| 129 | `src/components/ProductPriceHistoryChart.jsx` | 193 |
| 130 | `src/components/ProtectedRoute.jsx` | 37 |
| 131 | `src/components/PullToRefresh.jsx` | 104 |
| 132 | `src/components/QuickPriceDBAccess.jsx` | 314 |
| 133 | `src/components/RecordarTrabajo.jsx` | 27 |
| 134 | `src/components/RefrigerantGuide.jsx` | 251 |
| 135 | `src/components/RefrigerantMaintenanceAlert.jsx` | 223 |
| 136 | `src/components/RefrigerantReport.jsx` | 302 |
| 137 | `src/components/RefrigerantSelector.jsx` | 193 |
| 138 | `src/components/SATKanban.jsx` | 155 |
| 139 | `src/components/SATOrderDialog.jsx` | 539 |
| 140 | `src/components/SATSharePanel.jsx` | 74 |
| 141 | `src/components/SATSignaturePanel.jsx` | 235 |
| 142 | `src/components/SATTechReport.jsx` | 353 |
| 143 | `src/components/SATTemplateSelector.jsx` | 335 |
| 144 | `src/components/SectionBackground.jsx` | 48 |
| 145 | `src/components/SendDocumentEmailPanel.jsx` | 141 |
| 146 | `src/components/SignatureHistoryViewer.jsx` | 97 |
| 147 | `src/components/SignaturePad.jsx` | 238 |
| 148 | `src/components/SolarWiringDiagram.jsx` | 156 |
| 149 | `src/components/StorageSetupNotice.jsx` | 124 |
| 150 | `src/components/SupplierCatalogImport.jsx` | 408 |
| 151 | `src/components/SupplierCatalogImportWithSupplier.jsx` | 1052 |
| 152 | `src/components/SupplierCatalogManager.jsx` | 230 |
| 153 | `src/components/SupplierDataFetcher.jsx` | 75 |
| 154 | `src/components/SupplierOnlineUpdate.jsx` | 1261 |
| 155 | `src/components/SupplierPriceManager.jsx` | 356 |
| 156 | `src/components/SupplierProductQuery.jsx` | 257 |
| 157 | `src/components/SupplierProductSearch.jsx` | 184 |
| 158 | `src/components/TechnicianSelect.jsx` | 66 |
| 159 | `src/components/ThemeToggle.jsx` | 25 |
| 160 | `src/components/ThermalCalcViewer.jsx` | 314 |
| 161 | `src/components/ThermalCharts.jsx` | 217 |
| 162 | `src/components/TipoDeFuentePanel.jsx` | 181 |
| 163 | `src/components/UpdateChecker.jsx` | 322 |
| 164 | `src/components/UpdateErrorsTable.jsx` | 454 |
| 165 | `src/components/UserNotRegisteredError.jsx` | 31 |
| 166 | `src/components/ValidCharsConfig.jsx` | 194 |
| 167 | `src/components/VerificacionDocumentos.jsx` | 134 |
| 168 | `src/components/Vista3DPlano.jsx` | 273 |
| 169 | `src/components/VistaPreviaDocumento.jsx` | 142 |
| 170 | `src/components/autoNumber.jsx` | 26 |
| 171 | `src/components/refrigerantData.jsx` | 335 |
| 172 | `src/components/solar/AIReportPanel.jsx` | 94 |
| 173 | `src/components/solar/ClientSparePartsTab.jsx` | 268 |
| 174 | `src/components/solar/InverterComparison.jsx` | 305 |
| 175 | `src/components/solar/MontajeIlustration.jsx` | 160 |
| 176 | `src/components/solar/PVGISReport.jsx` | 1438 |
| 177 | `src/components/solar/SolarPVGISCalc.jsx` | 448 |
| 178 | `src/components/solar/SolarSiteReport.jsx` | 465 |
| 179 | `src/components/solar/SolarSparePartsTab.jsx` | 209 |
| 180 | `src/components/solar/SupplierPriceLookup.jsx` | 79 |
| 181 | `src/components/ui/accordion.jsx` | 41 |
| 182 | `src/components/ui/alert-dialog.jsx` | 97 |
| 183 | `src/components/ui/alert.jsx` | 47 |
| 184 | `src/components/ui/aspect-ratio.jsx` | 5 |
| 185 | `src/components/ui/avatar.jsx` | 35 |
| 186 | `src/components/ui/badge.jsx` | 34 |
| 187 | `src/components/ui/breadcrumb.jsx` | 92 |
| 188 | `src/components/ui/button.jsx` | 48 |
| 189 | `src/components/ui/calendar.jsx` | 71 |
| 190 | `src/components/ui/card.jsx` | 54 |
| 191 | `src/components/ui/carousel.jsx` | 193 |
| 192 | `src/components/ui/chart.jsx` | 309 |
| 193 | `src/components/ui/checkbox.jsx` | 22 |
| 194 | `src/components/ui/collapsible.jsx` | 11 |
| 195 | `src/components/ui/command.jsx` | 116 |
| 196 | `src/components/ui/context-menu.jsx` | 156 |
| 197 | `src/components/ui/dialog.jsx` | 123 |
| 198 | `src/components/ui/drawer.jsx` | 92 |
| 199 | `src/components/ui/dropdown-menu.jsx` | 156 |
| 200 | `src/components/ui/form.jsx` | 134 |
| 201 | `src/components/ui/hover-card.jsx` | 25 |
| 202 | `src/components/ui/input-otp.jsx` | 53 |
| 203 | `src/components/ui/input.jsx` | 19 |
| 204 | `src/components/ui/label.jsx` | 16 |
| 205 | `src/components/ui/menubar.jsx` | 200 |
| 206 | `src/components/ui/navigation-menu.jsx` | 104 |
| 207 | `src/components/ui/number-field.jsx` | 66 |
| 208 | `src/components/ui/pagination.jsx` | 100 |
| 209 | `src/components/ui/popover.jsx` | 27 |
| 210 | `src/components/ui/progress.jsx` | 23 |
| 211 | `src/components/ui/radio-group.jsx` | 29 |
| 212 | `src/components/ui/resizable.jsx` | 42 |
| 213 | `src/components/ui/scroll-area.jsx` | 38 |
| 214 | `src/components/ui/select.jsx` | 121 |
| 215 | `src/components/ui/separator.jsx` | 23 |
| 216 | `src/components/ui/sheet.jsx` | 109 |
| 217 | `src/components/ui/sidebar.jsx` | 626 |
| 218 | `src/components/ui/skeleton.jsx` | 14 |
| 219 | `src/components/ui/slider.jsx` | 21 |
| 220 | `src/components/ui/sonner.jsx` | 29 |
| 221 | `src/components/ui/switch.jsx` | 22 |
| 222 | `src/components/ui/table.jsx` | 86 |
| 223 | `src/components/ui/tabs.jsx` | 41 |
| 224 | `src/components/ui/textarea.jsx` | 18 |
| 225 | `src/components/ui/toast.jsx` | 104 |
| 226 | `src/components/ui/toaster.jsx` | 16 |
| 227 | `src/components/ui/toggle-group.jsx` | 44 |
| 228 | `src/components/ui/toggle.jsx` | 38 |
| 229 | `src/components/ui/tooltip.jsx` | 28 |
| 230 | `src/components/ui/use-toast.jsx` | 61 |
| 231 | `src/fuentes.css` | 91 |
| 232 | `src/hooks/use-mobile.jsx` | 19 |
| 233 | `src/hooks/useHistorial.js` | 64 |
| 234 | `src/index.css` | 196 |
| 235 | `src/lib/AuthContext.jsx` | 161 |
| 236 | `src/lib/NavigationTracker.jsx` | 42 |
| 237 | `src/lib/PageNotFound.jsx` | 76 |
| 238 | `src/lib/app-params.js` | 54 |
| 239 | `src/lib/availability.js` | 276 |
| 240 | `src/lib/avisoServidor.js` | 360 |
| 241 | `src/lib/avisoTemporal.js` | 29 |
| 242 | `src/lib/backupEngine.js` | 449 |
| 243 | `src/lib/camposExtra.js` | 112 |
| 244 | `src/lib/cargarTodo.js` | 44 |
| 245 | `src/lib/catalogoMaquinas.js` | 201 |
| 246 | `src/lib/cerramientos.js` | 281 |
| 247 | `src/lib/codigosError.js` | 722 |
| 248 | `src/lib/codigosPostales.js` | 230 |
| 249 | `src/lib/compressImage.js` | 188 |
| 250 | `src/lib/copiaFirmada.js` | 111 |
| 251 | `src/lib/copiasLotes.js` | 247 |
| 252 | `src/lib/cp-espana-datos.js` | 23 |
| 253 | `src/lib/dailyAutoUpdate.js` | 353 |
| 254 | `src/lib/datosEmpresa.js` | 306 |
| 255 | `src/lib/diagnosticoClima.js` | 327 |
| 256 | `src/lib/diarioDeReparaciones.js` | 127 |
| 257 | `src/lib/disenoDocumento.js` | 184 |
| 258 | `src/lib/documentacionTecnica.js` | 142 |
| 259 | `src/lib/externalStorage.js` | 142 |
| 260 | `src/lib/fichaTecnica.js` | 219 |
| 261 | `src/lib/fonts.js` | 107 |
| 262 | `src/lib/gasesFluorados.js` | 753 |
| 263 | `src/lib/guardadoDeVerdad.js` | 64 |
| 264 | `src/lib/guardarCopia.js` | 561 |
| 265 | `src/lib/hojaSanitaria.js` | 258 |
| 266 | `src/lib/homeDataCache.js` | 107 |
| 267 | `src/lib/image-search-ai.js` | 247 |
| 268 | `src/lib/informePlano.js` | 280 |
| 269 | `src/lib/inspeccionSanitaria.js` | 296 |
| 270 | `src/lib/license.config.js` | 42 |
| 271 | `src/lib/licenseManager.js` | 261 |
| 272 | `src/lib/limiteServidor.js` | 113 |
| 273 | `src/lib/modelosDocumentos.js` | 546 |
| 274 | `src/lib/modelosExpediente.js` | 678 |
| 275 | `src/lib/modelosGenerales.js` | 879 |
| 276 | `src/lib/modelosLegalizacion.js` | 859 |
| 277 | `src/lib/modoSinIA.js` | 90 |
| 278 | `src/lib/offlineCache.js` | 46 |
| 279 | `src/lib/planoCalculos.js` | 637 |
| 280 | `src/lib/planoFormas.js` | 135 |
| 281 | `src/lib/planoRecorrido.js` | 302 |
| 282 | `src/lib/planoSimbolos.js` | 430 |
| 283 | `src/lib/planoVariantes.js` | 162 |
| 284 | `src/lib/plans.config.js` | 39 |
| 285 | `src/lib/plantillasCatalogo.js` | 460 |
| 286 | `src/lib/prefetch.js` | 59 |
| 287 | `src/lib/presionesRefrigerante.js` | 444 |
| 288 | `src/lib/presupuestoIA.js` | 275 |
| 289 | `src/lib/printHelper.js` | 144 |
| 290 | `src/lib/proveedorIA.js` | 956 |
| 291 | `src/lib/query-client.js` | 14 |
| 292 | `src/lib/queryConfig.js` | 23 |
| 293 | `src/lib/recuperarTrabajo.js` | 259 |
| 294 | `src/lib/refrigerantes.js` | 195 |
| 295 | `src/lib/sanitizeHtml.js` | 73 |
| 296 | `src/lib/saveErrorMessage.js` | 152 |
| 297 | `src/lib/temas.js` | 180 |
| 298 | `src/lib/tipoDeFuente.js` | 540 |
| 299 | `src/lib/umbralesRite.js` | 50 |
| 300 | `src/lib/uploadImage.js` | 269 |
| 301 | `src/lib/uploadPhotosSequential.js` | 50 |
| 302 | `src/lib/useDebounce.js` | 53 |
| 303 | `src/lib/useOptimisticDelete.js` | 46 |
| 304 | `src/lib/utils.js` | 9 |
| 305 | `src/lib/whatsapp.js` | 86 |
| 306 | `src/main.jsx` | 38 |
| 307 | `src/pages.config.js` | 190 |
| 308 | `src/pages/ACPlanAnalysis.jsx` | 918 |
| 309 | `src/pages/ACPotenciaCalc.jsx` | 1395 |
| 310 | `src/pages/AIAssistant.jsx` | 193 |
| 311 | `src/pages/AIBudget.jsx` | 734 |
| 312 | `src/pages/AIPlanning.jsx` | 455 |
| 313 | `src/pages/AIReports.jsx` | 401 |
| 314 | `src/pages/AISearch.jsx` | 244 |
| 315 | `src/pages/AISupport.jsx` | 228 |
| 316 | `src/pages/Agenda.jsx` | 382 |
| 317 | `src/pages/AuditLog.jsx` | 124 |
| 318 | `src/pages/Automations.jsx` | 321 |
| 319 | `src/pages/Availability.jsx` | 531 |
| 320 | `src/pages/BackupCenter.jsx` | 1508 |
| 321 | `src/pages/BatteryCalc.jsx` | 512 |
| 322 | `src/pages/BusinessCards.jsx` | 713 |
| 323 | `src/pages/CapillaryCalc.jsx` | 326 |
| 324 | `src/pages/Catalogs.jsx` | 157 |
| 325 | `src/pages/ClientPortal.jsx` | 514 |
| 326 | `src/pages/CodigosError.jsx` | 251 |
| 327 | `src/pages/ColdRoomCalc.jsx` | 1029 |
| 328 | `src/pages/CompanyConfig.jsx` | 1566 |
| 329 | `src/pages/ContactDetail.jsx` | 1219 |
| 330 | `src/pages/ContactForm.jsx` | 98 |
| 331 | `src/pages/Contacts.jsx` | 514 |
| 332 | `src/pages/DanfossTools.jsx` | 107 |
| 333 | `src/pages/DiagnosticoCarga.jsx` | 1507 |
| 334 | `src/pages/DocumentTemplates.jsx` | 802 |
| 335 | `src/pages/Documents.jsx` | 1460 |
| 336 | `src/pages/ElectricalCalc.jsx` | 163 |
| 337 | `src/pages/EquipmentDiaryPage.jsx` | 462 |
| 338 | `src/pages/EquipmentFailureHistory.jsx` | 367 |
| 339 | `src/pages/ExportData.jsx` | 470 |
| 340 | `src/pages/GasSuppliers.jsx` | 242 |
| 341 | `src/pages/Home.jsx` | 898 |
| 342 | `src/pages/IncidentManagement.jsx` | 542 |
| 343 | `src/pages/Inventory.jsx` | 642 |
| 344 | `src/pages/LegalDocs.jsx` | 1284 |
| 345 | `src/pages/LicenseActivation.jsx` | 311 |
| 346 | `src/pages/LicenseRenewal.jsx` | 134 |
| 347 | `src/pages/Maintenance.jsx` | 853 |
| 348 | `src/pages/MaintenancePlanning.jsx` | 436 |
| 349 | `src/pages/Manuals.jsx` | 614 |
| 350 | `src/pages/MultiAreaCalc.jsx` | 254 |
| 351 | `src/pages/Notes.jsx` | 253 |
| 352 | `src/pages/PlanoIA.jsx` | 2769 |
| 353 | `src/pages/PresionesGas.jsx` | 391 |
| 354 | `src/pages/PresupuestoPublico.jsx` | 715 |
| 355 | `src/pages/ProjectTimeline.jsx` | 194 |
| 356 | `src/pages/Projects.jsx` | 464 |
| 357 | `src/pages/PurchaseSummary.jsx` | 279 |
| 358 | `src/pages/RefrigerantEquiv.jsx` | 607 |
| 359 | `src/pages/Regulations.jsx` | 388 |
| 360 | `src/pages/Reports.jsx` | 399 |
| 361 | `src/pages/SAT.jsx` | 978 |
| 362 | `src/pages/SATCalendar.jsx` | 397 |
| 363 | `src/pages/SATChat.jsx` | 328 |
| 364 | `src/pages/SATPublico.jsx` | 605 |
| 365 | `src/pages/SharingWarning.jsx` | 151 |
| 366 | `src/pages/SmartReminders.jsx` | 339 |
| 367 | `src/pages/SolarBatteryCalc.jsx` | 1040 |
| 368 | `src/pages/SolarCalc.jsx` | 378 |
| 369 | `src/pages/SparePartsManager.jsx` | 18 |
| 370 | `src/pages/SupplierTariffs.jsx` | 688 |
| 371 | `src/pages/Suppliers.jsx` | 612 |
| 372 | `src/pages/TablasRefrigerantes.jsx` | 116 |
| 373 | `src/pages/TechnicianDay.jsx` | 618 |
| 374 | `src/pages/TechnicianFieldWork.jsx` | 320 |
| 375 | `src/pages/TecniciansRoutes.jsx` | 478 |
| 376 | `src/pages/ThermalCalc.jsx` | 557 |
| 377 | `src/pages/UpdateCenter.jsx` | 322 |
| 378 | `src/pages/VerificarDocumento.jsx` | 130 |
| 379 | `tailwind.config.js` | 93 |
| 380 | `vite.config.js` | 34 |
| 381 | `vite.config.offline.js` | 28 |

**Total: 381 ficheros. 98.804 líneas.**
