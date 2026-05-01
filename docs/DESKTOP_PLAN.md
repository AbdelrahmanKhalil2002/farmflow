# FarmFlow — Desktop App Plan

> **Backend:** Existing Node/Express + MongoDB (CORS updated to allow `app://localhost` — only change)
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
| D1.4 | Dev workflow: `concurrently` starts Vite dev server + Electron via `npm run dev`; Electron waits for `:5173` via `wait-on` | [x] |
| D1.5 | Prod build: `npm run build` → `vite build` then `electron-builder`; React build bundled via `extraResources`; `app://localhost` protocol handler serves static files + proxies `/api/` + `/uploads/` to `localhost:5001` | [x] |
| D1.6 | App icon: `assets/icon.png` copied from mobile (1024×1024); `electron-builder` auto-generates `.icns` (macOS) + `.ico` (Windows) | [x] |
| D1.7 | Window state persistence: `electron-store` saves `x/y/width/height/maximized`; restores on next launch | [x] |
| D1.8 | Security: `nodeIntegration: false`, `contextIsolation: true`; `webSecurity` relaxed only in dev; external links open in system browser via `setWindowOpenHandler` + `will-navigate` guard | [x] |

---

## Phase 2 — Native File System Integration

### D2. Export to Disk

The web app currently exports CSV and PDF via browser download (blob URL). In the desktop app, these should open a native Save dialog and write directly to disk.

| # | Task | Status |
|---|------|--------|
| D2.1 | IPC channel `save-file`: renderer sends `{ filename, buffer, defaultPath }`; main process opens `dialog.showSaveDialog` → writes file with `fs.writeFile`; returns `{ success, filePath }` | [ ] |
| D2.2 | IPC channel `open-file`: opens a saved file with the OS default app (`shell.openPath`) | [ ] |
| D2.3 | Update `SellerStatements` CSV export: detect `window.electron` → use `save-file` IPC instead of blob `<a>` download | [ ] |
| D2.4 | Update `SellerStatements` PDF export: same detection → pipe PDF bytes through `save-file` IPC | [ ] |
| D2.5 | Success toast shows file path with "فتح الملف ←" button (triggers `open-file` IPC) | [ ] |

---

## Phase 3 — System Tray & Native Notifications

### D3. OS Integration

| # | Task | Status |
|---|------|--------|
| D3.1 | System tray icon (`Tray`) with context menu: عرض FarmFlow / فصل / إنهاء | [ ] |
| D3.2 | Tray badge (macOS): set `app.dock.setBadge(count)` when unread notification count > 0; IPC channel `set-badge` called from React `NotificationBell` | [ ] |
| D3.3 | Windows taskbar overlay icon for unread badge (equivalent to D3.2 on Windows) | [ ] |
| D3.4 | Native OS notifications: IPC channel `notify` — main process creates `new Notification({ title, body })`; click routes user to relevant screen via `webContents.send('navigate', path)` | [ ] |
| D3.5 | App menu (macOS menu bar / Windows top menu): File (تسجيل الخروج, إنهاء) · View (تكبير, مستعرض كامل) · Help (عن البرنامج, التحقق من التحديثات) | [ ] |
| D3.6 | Keyboard shortcuts registered via `globalShortcut` or `Menu` accelerators: Ctrl+N → new listing, Ctrl+Shift+E → expenses, Ctrl+, → settings | [ ] |

---

## Phase 4 — Offline Local Cache

### D4. Offline-First Data

The desktop app is typically used in a fixed location (farm office) where connectivity may be intermittent. A lightweight local cache keeps it usable when the backend is unreachable.

| # | Task | Status |
|---|------|--------|
| D4.1 | `electron-store` instance in main process; IPC channels `store-get`, `store-set`, `store-delete` exposed via preload | [ ] |
| D4.2 | Cache strategy: on successful API response, write to store keyed by endpoint + params; serve from store on network error with "بيانات محفوظة مؤقتاً" banner | [ ] |
| D4.3 | Offline write queue: expense adds, weight entries, and animal notes saved to store queue when offline; synced automatically on next successful API call | [ ] |
| D4.4 | React `useElectronCache(endpoint)` hook: tries live fetch → falls back to `store-get`; returns `{ data, isStale }` | [ ] |
| D4.5 | Connectivity detection: `net.isOnline()` checked every 30s in main process; broadcasts `connectivity-change` event to renderer | [ ] |

---

## Phase 5 — Auto-Updater & Build Pipeline

### D5. Distribution

| # | Task | Status |
|---|------|--------|
| D5.1 | `electron-updater` integrated in main process: checks for updates on launch (silent) + via Help menu; downloads in background; prompts user to restart | [ ] |
| D5.2 | Update server: GitHub Releases (`publish: { provider: 'github' }` in electron-builder config); tag `vX.Y.Z` triggers CI build + release | [ ] |
| D5.3 | macOS build: `dmg` installer; code signing via `CSC_LINK` env var (Apple Developer ID Application cert); notarization via `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` | [ ] |
| D5.4 | Windows build: `nsis` installer (one-click, silent option); code signing via EV certificate (optional for v1; unsigned shows SmartScreen warning) | [ ] |
| D5.5 | GitHub Actions CI: matrix build `[macos-latest, windows-latest]`; runs on tag push; uploads artifacts to GitHub Release | [ ] |
| D5.6 | `electron-builder` config: `appId: com.farmflow.desktop`, `productName: FarmFlow`, `copyright`, `files` array (exclude `node_modules` dev deps) | [ ] |

---

## Phase 6 — Polish & Platform UX

### D6. Platform-Specific Polish

| # | Task | Status |
|---|------|--------|
| D6.1 | macOS: frameless window (`titleBarStyle: 'hiddenInset'`) with traffic lights; custom CSS title bar area in React (`-webkit-app-region: drag`) | [ ] |
| D6.2 | Windows: `titleBarOverlay` with FarmFlow green (`#3A7D44`) background for coloured title bar | [ ] |
| D6.3 | Splash screen: native `BrowserWindow` (400×300, no frame) shows FarmFlow logo while main window loads; closes when main window is ready | [ ] |
| D6.4 | `farmflow://` deep link protocol registered (`setAsDefaultProtocolClient`); handles `farmflow://listing/:id` and `farmflow://order/:id` links from emails | [ ] |
| D6.5 | Single instance lock (`app.requestSingleInstanceLock`): second launch focuses existing window instead of opening duplicate | [ ] |
| D6.6 | Arabic spellcheck: `webPreferences.spellcheck: true`; set language to `ar` via `session.setSpellCheckerLanguages(['ar', 'en-US'])` | [ ] |
| D6.7 | Right-click context menu: copy / paste / select all (standard electron `contextmenu` handler, especially needed for Arabic text inputs) | [ ] |

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

**Phase 1 — D1 Scaffold ✅ DONE**
`farmflow_desktop/` created with Electron 32.3.3 + electron-builder + electron-store. `main.js`: BrowserWindow 1400×900 (min 1200×700), window state persisted via electron-store, `show: false` + `ready-to-show` to avoid white flash, external links open in system browser. Dev: loads `http://localhost:5173` (Vite proxy covers `/api/`). Prod: custom `app://localhost` protocol registered as privileged — `protocol.handle` serves React static build AND proxies `/api/` + `/uploads/` to `localhost:5001` via `net.fetch` (zero changes to React needed). Backend CORS updated to accept `app://localhost` origin alongside web origins. `preload.js` exposes `{ platform, isDesktop }` via contextBridge with commented stubs for Phase 2–3 IPC channels. `assets/icon.png` (1024×1024) copied from mobile. Run: `cd farmflow_desktop && npm run dev` (requires backend + Vite running).

**Phase 2 — D2 File Export**
CSV/PDF saved to disk with native dialog. Most-requested seller feature for desktop.

**Phase 3 — D3 OS Integration**
Tray icon, native notifications, app menu, keyboard shortcuts.

**Phase 4 — D4 Offline Cache**
Local data cache + write queue for intermittent connectivity.

**Phase 5 — D5 Auto-Updater + CI**
Signed installers, GitHub Actions pipeline, auto-update on launch.

**Phase 6 — D6 Polish**
Platform-specific title bar, splash, deep links, single instance, Arabic spellcheck.

---

## Current Status Summary

> **Desktop app:** Not started. React web app (100% complete) will be wrapped in Electron. Estimated effort: Phase 1 (1–2 days), Phase 2 (1 day), Phase 3 (1–2 days), Phase 4 (2–3 days), Phase 5 (2 days), Phase 6 (1–2 days). Full production-ready desktop app in ~10 days of focused work.

**Blocked on external credentials (same as web):**
- Code signing cert (Apple Developer ID for macOS notarization; EV cert for Windows SmartScreen)
- Auto-update server (GitHub account for GitHub Releases — free)
