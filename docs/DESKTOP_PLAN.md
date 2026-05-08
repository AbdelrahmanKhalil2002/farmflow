# FarmFlow — Desktop App Plan

> **Backend:** Deployed on Render at `https://farmflow-backend-g07p.onrender.com` · MongoDB Atlas M0 (Ireland) · CORS updated to allow `app://localhost`
> **Desktop stack:** Electron · existing React/Vite frontend (reused as-is) · electron-builder · electron-store
> **Languages:** Arabic (default, RTL) · English (switchable)
> **Platforms:** macOS (primary) · Windows (secondary) · Linux (optional)
> **Users:** Seller (farm owner) · Admin · Buyer (secondary — desktop is seller/admin-first)

---

## Approach: Electron Wrapping the Existing React Frontend

The React web app is 100% feature-complete across all 30 sections. Wrapping it in Electron gives **instant full-feature parity** with zero UI rework. The desktop app adds value through native OS integration that a browser cannot provide:

| What a browser gives you | What the desktop app adds |
|--------------------------|--------------------------|
| Runs in a tab | Standalone window, taskbar/dock presence |
| Download dialog for exports | Native Save dialog → writes directly to disk |
| Web push (unreliable, permission-heavy) | Native OS notifications always work |
| No system tray | Tray icon: quick access + unread badge |
| Refresh to update | Silent auto-updater in background |
| No URL scheme | `farmflow://` deep links from emails / notifications |
| Lost on browser close | Runs minimized, persists session |

**Why Electron over alternatives:**
- **Tauri** (Rust shell): lighter bundle (~5 MB vs ~80 MB) but requires Rust for native features — adds complexity for marginal gain at this stage.
- **Flutter Desktop**: would need full layout redesign for large screens; all the mobile-app work applies here too.
- **Electron** is the right call: the React frontend already exists, Electron is proven (VS Code, Figma, Slack), and the team doesn't need to learn a new language.

---

## Status Legend

- [x] Done
- [-] Partial
- [ ] Not started

---

## Phase 1 — Electron Scaffold

### D1. Project Setup

| # | Task | Status |
|---|------|--------|
| D1.1 | Create `farmflow_desktop/` directory; `npm init` with `electron`, `electron-builder`, `concurrently` | [x] |
| D1.2 | `main.js` — main process: `BrowserWindow` (1400×900, min 1200×700); loads Vite dev server in dev, `app://localhost/` in prod | [x] |
| D1.3 | `preload.js` — `contextBridge.exposeInMainWorld('electron', {platform, isDesktop})` for safe IPC; `nodeIntegration: false`, `contextIsolation: true` | [x] |
| D1.4 | Dev workflow: `concurrently` starts **backend + Vite + Electron** via `npm run dev`; Electron waits for `tcp:localhost:5001` and `http://localhost:5173` via `wait-on` | [x] |
| D1.5 | Prod build: `npm run build` → `vite build` then `electron-builder`; React build bundled via `extraResources`; `app://localhost` protocol handler serves static files + proxies `/api/` + `/uploads/` to `BACKEND_ORIGIN` (`https://farmflow-backend-g07p.onrender.com`; overridable via `FARMFLOW_API_URL` env var) | [x] |
| D1.6 | App icon: `assets/icon.png` copied from mobile (1024×1024); `electron-builder` auto-generates `.icns` (macOS) + `.ico` (Windows) | [x] |
| D1.7 | Window state persistence: `electron-store` saves `x/y/width/height/maximized`; restores on next launch | [x] |
| D1.8 | Security: `nodeIntegration: false`, `contextIsolation: true`; `webSecurity` relaxed only in dev; external links open in system browser via `setWindowOpenHandler` + `will-navigate` guard | [x] |

---

## Phase 2 — Native File System Integration

### D2. Export to Disk

The web app currently exports CSV and PDF via browser download (blob URL). In the desktop app, these should open a native Save dialog and write directly to disk.

| # | Task | Status |
|---|------|--------|
| D2.1 | IPC channel `save-file`: renderer sends `{ filename, buffer, defaultPath }`; main process opens `dialog.showSaveDialog` → writes file with `fs.writeFile`; returns `{ success, filePath }` | [x] |
| D2.2 | IPC channel `open-file`: opens a saved file with the OS default app (`shell.openPath`) | [x] |
| D2.3 | Update `SellerStatements` CSV export: detect `window.electron` → use `save-file` IPC instead of blob `<a>` download | [x] |
| D2.4 | Update `SellerStatements` PDF export: same detection → pipe PDF bytes through `save-file` IPC | [x] |
| D2.5 | Success toast shows file path with "فتح الملف ←" button (triggers `open-file` IPC) | [x] |
| D2.6 | Extended native save to `SellerExpenses`, `SellerIncome`, and `SellerHerd` (herd export CSV button added to header) | [x] |

---

## Phase 3 — System Tray & Native Notifications

### D3. OS Integration

| # | Task | Status |
|---|------|--------|
| D3.1 | System tray icon with Arabic context menu (فتح FarmFlow / خروج); double-click shows/focuses window; close button hides to tray (`app._quitting` distinguishes real quit) | [x] |
| D3.2 | macOS dock badge via `app.setBadgeCount(n)`; tray icon gets red SVG circle overlay when count > 0; IPC `set-badge` called from React `NotificationBell` | [x] |
| D3.3 | Windows taskbar overlay badge via `win.setOverlayIcon(svgBadge, label)` | [x] |
| D3.4 | Native OS notifications: IPC `notify` → `new Notification({ title, body, icon }).show()` | [x] |
| D3.5 | Arabic native app menu (File / Edit / View / Window) via `src/ipc/menu.js`; applied via `Menu.setApplicationMenu` | [x] |
| D3.6 | Keyboard shortcuts via Menu accelerators: Cmd+Shift+E → export-csv, Cmd+Shift+P → export-pdf; `menu-action` IPC broadcast to renderer; all seller export pages subscribe via `window.electron.onMenuAction` with useEffect unsubscribe | [x] |

---

## Phase 4 — Offline Local Cache

### D4. Offline-First Data

The desktop app is typically used in a fixed location (farm office) where connectivity may be intermittent. A lightweight local cache keeps it usable when the backend is unreachable.

| # | Task | Status |
|---|------|--------|
| D4.1 | `electron-store` instance in main process; IPC channels `store-get`, `store-set`, `store-delete` exposed via preload | [-] |
| D4.2 | Cache strategy: on successful GET response, write to cache keyed by endpoint + params; serve from cache on network error with "بيانات محفوظة مؤقتاً" banner | [x] |
| D4.3 | Offline write queue: expense adds, weight entries, and animal notes saved to store queue when offline; synced automatically on next successful API call | [-] |
| D4.4 | React `useElectronCache(endpoint)` hook: tries live fetch → falls back to `store-get`; returns `{ data, isStale }` | [-] |
| D4.5 | Connectivity detection: browser `online`/`offline` events + `ff:cache-hit` custom event; `OfflineBanner` shown when offline or serving cached data | [x] |

---

## Phase 5 — Auto-Updater & Build Pipeline

### D5. Distribution

| # | Task | Status |
|---|------|--------|
| D5.1 | `electron-updater` integrated in main process (`src/updater.js`): silent check on launch; `autoDownload: true`, `autoInstallOnAppQuit: true`; Arabic dialogs for update-available + update-downloaded; skipped in dev | [x] |
| D5.2 | Update server: GitHub Releases (`publish: { provider: 'github', owner: 'abdelrahmankhalil', repo: 'FarmFlow' }` in package.json) | [x] |
| D5.3 | macOS build: `dmg` target, `arm64 + x64` architectures; code signing (CSC_LINK / notarization) not yet configured | [-] |
| D5.4 | Windows build: `nsis` installer, `x64`; `oneClick: false`, `allowToChangeInstallationDirectory: true`; EV code signing not yet configured | [-] |
| D5.5 | GitHub Actions CI: matrix build on tag push, upload to GitHub Releases | [x] |
| D5.6 | `electron-builder` config complete: `appId: com.farmflow.desktop`, `productName: FarmFlow`, `copyright`, `files`, `extraResources` bundling React build | [x] |

---

## Phase 6 — Polish & Platform UX

### D6. Platform-Specific Polish

| # | Task | Status |
|---|------|--------|
| D6.1 | macOS: frameless window (`titleBarStyle: 'hiddenInset'`) with traffic lights; custom CSS title bar area in React (`-webkit-app-region: drag`) | [x] |
| D6.2 | Windows: `titleBarOverlay` with FarmFlow green (`#3A7D44`) background for coloured title bar | [x] |
| D6.3 | Splash screen: native `BrowserWindow` (400×300, no frame) shows FarmFlow logo while main window loads; closes when main window is ready | [x] |
| D6.4 | `farmflow://` deep link protocol registered (`setAsDefaultProtocolClient`); handles `farmflow://listing/:id` and `farmflow://order/:id` links from emails | [x] |
| D6.5 | Single instance lock (`app.requestSingleInstanceLock`): second launch focuses existing window instead of opening duplicate | [x] |
| D6.6 | Arabic spellcheck: `webPreferences.spellcheck: true`; set language to `ar` via `session.setSpellCheckerLanguages(['ar', 'en-US'])` | [x] |
| D6.7 | Right-click context menu: copy / paste / select all (standard electron `contextmenu` handler, especially needed for Arabic text inputs) | [x] |

---

## Folder Structure

```
farmflow_desktop/
├── main.js                  # main process entry point
├── preload.js               # contextBridge IPC exposure
├── package.json             # electron + electron-builder config
├── electron-builder.yml     # build targets (dmg + nsis)
├── assets/
│   ├── icon.png             # 1024×1024 source icon
│   ├── icon.icns            # macOS (generated by electron-builder)
│   └── icon.ico             # Windows (generated by electron-builder)
└── src/
    ├── tray.js              # Tray setup + context menu
    ├── updater.js           # electron-updater setup
    ├── store.js             # electron-store instance
    ├── menu.js              # app menu (macOS menu bar / Windows)
    └── ipc/
        ├── file.js          # save-file + open-file handlers
        ├── notification.js  # native notification + badge
        └── cache.js         # store-get / store-set / store-delete
```

The `frontend/` directory is used as-is — no changes to the React app needed for Phase 1. Phases 2–6 add small detection checks in React (`window.electron ? ... : ...`).

---

## React Frontend Changes (Minimal)

All changes in the React app are additive and non-breaking — the web version continues to work unchanged.

| File | Change |
|------|--------|
| `frontend/src/utils/platform.js` | `export const isDesktop = !!window.electron` helper |
| `frontend/src/utils/fileExport.js` | Export functions check `isDesktop` → IPC or blob fallback |
| `frontend/src/components/NotificationBell.jsx` | On unread count change → `window.electron?.setBadge(count)` |
| `frontend/src/layouts/SellerLayout.jsx` | If `isDesktop`: hide browser-specific UI (URL bar hints, etc.) |

---

## Build Order

**Phase 0 — Preload IPC Activation ✅ (applied across all phases)**
All `preload.js` IPC bridges that were previously commented out as placeholders are now active: `saveFile`, `openFile`, `savePdf` (Phase 2); `notify`, `setBadge` (Phase 3); `onMenuAction` (Phase 4). New `onDeepLink` bridge added — exposes `window.electron.onDeepLink(cb)` for `farmflow://` deep-link handling from `D6.4`.

**Phase 1 — D1 Scaffold ✅ DONE**
`farmflow_desktop/` created with Electron 32.3.3 + electron-builder + electron-store. `main.js`: BrowserWindow 1400×900 (min 1200×700), window state persisted via electron-store, `show: false` + `ready-to-show` to avoid white flash, external links open in system browser. Dev: loads `http://localhost:5173`. Prod: `app://localhost` privileged protocol — `protocol.handle` serves React static build AND proxies `/api/` + `/uploads/` to `BACKEND_ORIGIN` (`https://farmflow-backend-g07p.onrender.com`) via `net.fetch`. Backend CORS allows `app://localhost`. Dev script (concurrently) starts backend + Vite + Electron with wait-on gate.

**Phase 2 — D2 File Export ✅ DONE**
`src/ipc/file.js`: `save-file` (dialog.showSaveDialog → fs.writeFile) + `open-file` (shell.openPath). `preload.js` exposes `saveFile` + `openFile`. `isDesktop` flag in `frontend/src/utils/platform.js`. Native save wired into `SellerStatements` (CSV + PDF), `SellerExpenses` (CSV), `SellerIncome` (CSV), and `SellerHerd` (CSV — new export button added to header). Success toast shows file path with "فتح الملف" button.

**Phase 3 — D3 OS Integration ✅ DONE**
`src/tray.js`: tray icon, Arabic context menu, minimize-to-tray, `updateBadge`. `src/ipc/notify.js`: `notify` + `set-badge` IPC; badge forwarded to tray via `onBadgeChange` callback. `src/ipc/menu.js`: full Arabic app menu (File/Edit/View/Window) with Cmd+Shift+E/P export shortcuts; `menu-action` IPC broadcast; `preload.js` exposes `onMenuAction(cb)` → unsubscribe fn.

**Phase 4 — D4 Offline Cache (partial)**
D4.2 + D4.5 implemented in the React layer (works in both web and Electron):
- `frontend/src/utils/apiCache.js` — localStorage read-through cache; 10-minute TTL; key = URL + serialised params
- `frontend/src/services/api.js` — success interceptor caches every GET response; error interceptor falls back to cache after retries are exhausted, fires `ff:cache-hit` CustomEvent
- `frontend/src/components/OfflineBanner.jsx` — fixed amber banner at top of viewport; listens to browser `online`/`offline` events + `ff:cache-hit`; dismissible
- Wired into `App.jsx` (global, above all routes)
Remaining (D4.1/D4.3/D4.4): `electron-store` IPC channels, offline write queue, and dedicated hook deferred to v2.

**Phase 5 — D5 Auto-Updater + CI ✅ DONE**
`src/updater.js` + GitHub Releases publish config done. Build targets configured (DMG arm64+x64, NSIS x64). `.github/workflows/build.yml`: matrix build on tag push (`v*`) — macOS DMG + Windows NSIS, uploaded to GitHub Releases via `electron-builder --publish always`. Signing cert env vars stubbed in comments for when certs are obtained.

**Phase 6 — D6 Polish ✅ DONE**
All 7 items implemented in `main.js` + React layouts:
- D6.1: `titleBarStyle: 'hiddenInset'` + `trafficLightPosition {x:16,y:14}` on macOS; `WebkitAppRegion: 'drag'` on sidebar brand section (Seller + Admin), full header (Buyer); collapse buttons and nav controls marked `no-drag`; extra top padding on macOS to clear traffic lights.
- D6.2: `titleBarOverlay { color:'#3A7D44', symbolColor:'#fff', height:40 }` on Windows.
- D6.3: `createSplash()` 400×300 frameless window shows `assets/splash.html` (green FarmFlow brand + animated loading bar); destroyed on `main.once('ready-to-show')`.
- D6.4: `app.setAsDefaultProtocolClient('farmflow')`; `open-url` handler (macOS) + `second-instance` command-line parse (Windows); `handleDeepLink` sends `deep-link` IPC to renderer; `preload.js` exposes `onDeepLink(cb)`; `DeepLinkHandler` React component (src/components/DeepLinkHandler.jsx) inside `<BrowserRouter>` maps `listing/:id`→`/buyer/listings/:id`, `farm/:id`→`/buyer/farms/:id`, `order/*`→`/buyer/orders`.
- D6.5: `app.requestSingleInstanceLock()` — second launch focuses existing window and forwards any deep-link URL.
- D6.6: `spellcheck: true` in webPreferences + `session.setSpellCheckerLanguages(['ar', 'en-US'])`.
- D6.7: `webContents.on('context-menu')` → Arabic Menu (نسخ / قص / لصق / تحديد الكل) + Dev Tools in dev mode.

---

## Current Status Summary (as of 2026-05-08)

> **Phases 1–6 fully complete.** The desktop app is feature-complete with full native OS integration including deep-link routing end-to-end. All preload IPC bridges are now active (saveFile, openFile, savePdf, notify, setBadge, onMenuAction, onDeepLink). Remaining blockers before shipping are external credentials only: Apple Developer ID cert for macOS notarization and a Windows EV cert for SmartScreen. Once obtained, uncomment the signing env vars in `.github/workflows/build.yml` and push a `v*` tag.
>
> **Phase 4 (offline cache) — partially implemented** via the shared React layer: `apiCache.js` (localStorage, 10-min TTL), axios interceptors cache every GET response and fall back to cache after retries, `OfflineBanner.jsx` shows when offline or serving stale data. D4.1/D4.3/D4.4 (electron-store IPC, write queue, dedicated hook) remain deferred to v2.
>
> **Full Arabic/English language switching** is available on the desktop app at no extra cost — it wraps the React frontend which had full i18n (section 34 of PLAN.md) applied to all seller pages, buyer pages, layouts, and settings in May 2026. The user switches language from Settings → Language in the same app window.

**Remaining (external credentials only):**
- Code signing: Apple Developer ID cert (macOS notarization) + EV cert (Windows SmartScreen)
- Store listings: Mac App Store / Microsoft Store submissions (optional)

**To ship v1.0.0:**
1. Obtain Apple Developer ID cert → set `MAC_CERT_BASE64` + `MAC_CERT_PASSWORD` + `APPLE_*` secrets in GitHub repo settings
2. Obtain Windows EV cert → set `WIN_CERT_BASE64` + `WIN_CERT_PASSWORD` secrets
3. `git tag v1.0.0 && git push origin v1.0.0` — GitHub Actions builds + uploads DMG + NSIS to Releases
