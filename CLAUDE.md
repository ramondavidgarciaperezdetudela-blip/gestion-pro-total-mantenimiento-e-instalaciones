# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Gestión Pro Total** is a Spanish-language SaaS for maintenance/installation/HVAC-refrigeration (SAT) service companies: clients, projects, maintenance schedules, inventory, suppliers, field technicians, technical calculators (electrical, thermal, solar PV, cold rooms...), floor-plan/budget drawing, AI assistants, and an ECDSA-signed licensing system. One codebase ships to four targets: web, Android (Capacitor), desktop (Electron), and a lightweight Expo Go preview (`movil-expo/`, a separate sub-project with its own `package.json`).

The frontend is React + Vite. The backend is **Base44** (a hosted low-code backend platform) — this repo does not run its own server; `base44/` only holds the *declarative source* for the Base44 project (entity schemas + serverless functions), which is deployed to Base44 separately from `npm run build`.

Almost all code comments, commit-facing prose, and UI strings are in **Spanish**. Keep new comments/UI text in Spanish to match the existing codebase, and prefer comments that explain a past bug or a non-obvious constraint (the existing style — see `src/api/base44Client.js` — favors "why this exists" over "what this does").

## Commands

```bash
npm install              # install deps
npm run dev               # Vite dev server (web, hot reload)
npm run build              # production web build -> dist/
npm run lint               # eslint . --quiet
npm run lint:fix            # eslint . --fix
npm run typecheck           # tsc -p ./jsconfig.json (checks only pages/Layout, see below)
npm run preview             # preview a production build
```

There is no test suite/framework in this repo (no `test` script, no `*.test.*`/`*.spec.*` files) — `npm run lint` and `npm run typecheck` are the available correctness checks. `npm run typecheck` only type-checks `src/pages/**/*.jsx` and `src/Layout.jsx` (per `jsconfig.json`'s `include`); `src/lib`, `src/api`, and `src/components/ui` are explicitly excluded.

Platform builds:

```bash
npm run build:electron       # web build with relative base (for Electron's file://)
npm run build:offline         # builds with vite.config.offline.js then inlines everything
                               # into one self-contained HTML via scripts/inline-offline.mjs
npm run electron:dev          # build:offline + launch Electron pointed at it
npm run desktop:dist           # build:electron + build:offline + electron-builder
                               # (installers land in release/, gitignored)

npm run android:build         # web build + cap sync android + gradlew assembleDebug
npm run cap:sync              # sync web build into the native Android project
npm run cap:open:android       # open the Android project in Android Studio
```

The `android/` and `ios/` native projects are generated (gitignored, see `docs/BUILD-MULTIPLATAFORMA.md`) — run `cap add android` (`npm run cap:add:android`) before an Android build if the folder doesn't exist yet.

```bash
cd movil-expo && npm install && npx expo start   # Expo Go preview (separate app, own package.json)
```

Releases are built and published by CI, not locally — see `.github/workflows/build-desktop.yml`, `build-apk.yml`, `build-playstore-aab.yml`. Pushing a `vX.Y.Z` tag (or a manual `workflow_dispatch` with a `version` input) publishes an official GitHub Release; otherwise manual runs update the rolling `desktop-latest`/`apk-latest` releases. `node.js.yml` runs `npm ci && npm run build && npm test` (test is a no-op) on push/PR to `main` across Node 18/20/22 — there's no separate lint-in-CI step, so run `npm run lint` locally before pushing.

## Architecture

### Backend: Base44 (`base44/`)

- `base44/config.jsonc` — project metadata + the install/build/serve commands Base44 uses.
- `base44/entities/*.jsonc` — JSON-Schema definitions of every data entity (Contact, Equipment, Invoice, SATOrder, StockItem, Supplier, MaintenanceSheet, ...). This is the authoritative schema; edit these when adding/changing a persisted field, not ad-hoc client code.
- `base44/functions/<name>/entry.ts` — serverless functions deployed to Base44 (e.g. `stockDiscount`, `generatePreventiveMaintenance`, `enviarCopiaFirmada`, `updateSupplierPricesOnline`). These run server-side on Base44's infrastructure, separate from the Vite build.

### Frontend entry & routing

- `src/main.jsx` → `src/App.jsx` → `src/pages.config.js` (**auto-generated**: a page component under `src/pages/` is auto-registered here; the only value meant to be hand-edited is `mainPage`. Don't manually restructure its imports/`PAGES` map). `pagesConfig.Layout` (`src/Layout.jsx`) wraps every routed page (nav, header, etc).
- Router choice matters: `App.jsx` picks `HashRouter` when `window.location.protocol === 'file:'` (the Electron desktop build, served from disk) and `BrowserRouter` otherwise (web/Android, for clean URLs). A few routes (`/presupuesto-publico`, `/sat-publico`, `/verificar-documento`, ...) are public, unauthenticated pages meant to be shared with clients (signed budgets/SAT tickets/document verification) and are mounted outside the normal page map in `App.jsx`.
- Path alias `@/*` → `src/*` (`jsconfig.json`, mirrored in `vite.config.js` via the `@base44/vite-plugin`).

### Auth & the Base44 client

- `src/lib/AuthContext.jsx` checks Base44's public app settings on load, then optionally checks user auth. The app is normally distributed **app-level** (no Base44 login for end customers — `requiresAuth: false`); a login is only required if Base44 returns `auth_required`. If the session check itself fails (offline, server down), the app still lets the user in (`entrarIgual`) rather than hard-blocking, since much of the app works without the server.
- `src/api/base44Client.js` wraps the raw `@base44/sdk` client in `Proxy`es so that **every entity save/update/delete and every server function call is retried and surfaced on failure** — this replaced ad-hoc error handling that used to be missing in ~141 places. When touching data-saving code, rely on this wrapper rather than adding your own try/catch-and-toast; see the file's header comment for the reasoning. `serverUrl`/`appBaseUrl` are always set to an absolute URL (never relative) because the installed apps (Electron `file://`, Android `https://localhost`) can't resolve relative API paths.
- `src/lib/app-params.js` resolves `appId`/`token`/`appBaseUrl` from URL params, `localStorage`, then Vite env vars (`VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`, set in `.env.production`).

### Licensing (ECDSA P-256)

A self-contained license-gate system, independent of Base44 auth — see `docs/SISTEMA-LICENCIAS.md` for the full write-up:
- `src/lib/licenseManager.js` — verifies license tokens (`base64url(payload).base64url(signature)`) against an embedded **public** key; the private signing key never lives in this repo.
- `src/lib/license.config.js` — feature flag (`enabled`), mode, and which routes stay exempt (the public shared-link pages above).
- `src/components/LicenseGate.jsx` — the activation-screen wrapper.
- Local (offline, default) vs cloud (`VITE_LICENSE_ENDPOINT`, allows revocation) verification modes are chosen at build time via env vars (see `.env.example`). `VITE_LICENSE_OWNER_BYPASS=1` skips the gate for the maintainer's own build.

### UI components

- `src/components/ui/` is a shadcn/ui (Radix-based, "new-york" style, `components.json`) generated component library — treat it as vendored: it's excluded from both ESLint (`eslint.config.js` `ignores`) and typecheck (`jsconfig.json` `exclude`). Prefer composing these primitives from `src/components/` rather than editing files under `ui/` directly.
- `src/components/` holds ~130 feature components (diagrams, calculators, panels, dialogs); `src/pages/` holds one file per route, generally composing those components plus `src/lib/*` business logic.
- Domain calculation/business logic that isn't UI lives in `src/lib/*.js` (e.g. `planoCalculos.js`/`planoFormas.js`/`planoRecorrido.js`/`planoSimbolos.js` for the floor-plan tool, `backupEngine.js`, `offlineCache.js`, `availability.js`, `diagnosticoClima.js`).

### Cross-platform packaging details

- `electron/main.cjs` + `electron/preload.cjs`: Electron main process. Notably implements its own backup-file writer (IPC handlers `gpt-guardar-copia`, `gpt-copia-*`) because the browser's "download a file" approach doesn't give a stable, discoverable path on desktop; it also drives `electron-updater` for auto-update, surfaced in the renderer via `UpdateChecker.jsx`.
- The desktop build prefers a single self-contained HTML file at `dist-offline/Gestion-Pro-Total.html` (produced by `build:offline` / `scripts/inline-offline.mjs`) over the normal multi-file `dist/`, since it works reliably from `file://`.
- `capacitor.config.json` configures the Android wrapper (`appId: com.gestionprototal.app`); Android release signing uses a keystore generated by `CREAR-CLAVE-FIRMA.bat` / `crear-clave-firma.sh` (never committed — see `.gitignore` and `docs/FIRMA-INSTALADORES.md`).

### Linting/typechecking scope

`eslint.config.js` only lints `src/components/**`, `src/pages/**`, and `src/Layout.jsx` (explicitly skipping `src/lib/**` and `src/components/ui/**`); it enforces no-unused-imports/vars (via `eslint-plugin-unused-imports`, prefix unused args/vars with `_` to silence) and React hooks rules, but has `no-unused-vars`/`react/prop-types` off. `jsconfig.json`'s typecheck `include` is narrower still (pages + `Layout.jsx` only). Keep this in mind when deciding whether a lint/typecheck pass will actually catch an issue in `src/lib/` or `src/api/`.

### Non-code directories

`docs/`, `distribucion/`, `herramientas/`, `servidor/`, `servidor-config/` contain manuals, legal text, marketing material, and standalone deployment/signing scripts (Python/shell/batch) unrelated to the app's runtime — generally not relevant unless a task specifically references them.
