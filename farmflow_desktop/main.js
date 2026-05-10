const {
  app, BrowserWindow, shell, protocol, net, Menu,
} = require('electron');
const path = require('path');
const Store = require('electron-store');
const { registerFileIpc }   = require('./src/ipc/file');
const { registerNotifyIpc } = require('./src/ipc/notify');
const { buildMenu }                              = require('./src/ipc/menu');
const { initAutoUpdater }                        = require('./src/updater');
const { createTray, handleWindowClose, updateBadge } = require('./src/tray');

const isDev = !app.isPackaged;

const BACKEND_ORIGIN = process.env.FARMFLOW_API_URL || 'https://xn--pgbnc3a9c8a.com';

// Path to the React build used in production
const distPath = isDev
  ? null
  : path.join(process.resourcesPath, 'frontend', 'dist');

// ── D6.5 Single-instance lock ─────────────────────────────────────────────────
// Second launch focuses the existing window and forwards any deep-link URL.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Custom protocol (production only) ────────────────────────────────────────
// Register app:// as a privileged scheme so the renderer treats it like https
// (same-origin, fetch API, service workers). Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard:             true,
      secure:               true,
      supportFetchAPI:      true,
      allowServiceWorkers:  true,
      corsEnabled:          false,
    },
  },
]);

// ── D6.4 farmflow:// deep-link protocol registration ─────────────────────────
// Registered before ready; handled via open-url (macOS) or second-instance (Windows)
if (process.defaultApp) {
  // Running via `electron .` in dev — register with the executable path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('farmflow', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('farmflow');
}

// ── Window state store ────────────────────────────────────────────────────────
const store = new Store();

// Keep a module-level reference so event handlers can reach the window.
let mainWin = null;

// ── D6.3 Splash screen ────────────────────────────────────────────────────────
function createSplash() {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame:           false,
    transparent:     true,
    resizable:       false,
    skipTaskbar:     true,
    alwaysOnTop:     true,
    center:          true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splash.loadFile(path.join(__dirname, 'assets', 'splash.html'));
  return splash;
}

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  const saved = store.get('windowBounds', { width: 1400, height: 900 });
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  const win = new BrowserWindow({
    x:         saved.x,
    y:         saved.y,
    width:     saved.width,
    height:    saved.height,
    minWidth:  1200,
    minHeight: 700,
    icon:      path.join(__dirname, 'assets', 'icon.png'),
    title:     'FarmFlow',
    show:      false, // reveal after content is ready to avoid white flash

    // ── D6.1 macOS: hidden title bar with traffic lights ──
    ...(isMac && {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 14 },
    }),

    // ── D6.2 Windows: coloured title bar overlay ──
    ...(isWin && {
      titleBarOverlay: {
        color:       '#3A7D44',
        symbolColor: '#ffffff',
        height:      40,
      },
    }),

    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      !isDev, // relax only in dev so Vite HMR works
      // ── D6.6 Arabic spellcheck ──
      spellcheck:       true,
    },
  });

  // ── D6.6 Set spellcheck languages after session is ready ─────────────────
  win.webContents.session.setSpellCheckerLanguages(['ar', 'en-US']);

  // ── Load content ───────────────────────────────────────────────────────────
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadURL('app://localhost/');
  }

  // Save bounds, then hide to tray instead of quitting (unless app._quitting)
  win.on('close', (event) => {
    store.set('windowMaximized', win.isMaximized());
    if (!win.isMaximized() && !win.isMinimized()) {
      store.set('windowBounds', win.getBounds());
    }
    handleWindowClose(event, win);
  });

  // Open external links in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the app (accidental link clicks)
  win.webContents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith('http://localhost:5173')) return;
    if (!isDev && url.startsWith('app://localhost')) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  // ── D6.7 Right-click context menu ────────────────────────────────────────
  win.webContents.on('context-menu', (_event, params) => {
    const { selectionText, isEditable } = params;
    const hasSelection = selectionText && selectionText.length > 0;

    const menu = Menu.buildFromTemplate([
      { label: 'نسخ',         role: 'copy',       enabled: hasSelection },
      { label: 'قص',          role: 'cut',        enabled: isEditable && hasSelection },
      { label: 'لصق',         role: 'paste',      enabled: isEditable },
      { type: 'separator' },
      { label: 'تحديد الكل', role: 'selectAll' },
      ...(isDev ? [{ type: 'separator' }, { label: 'أدوات المطور', role: 'toggleDevTools' }] : []),
    ]);
    menu.popup({ window: win });
  });

  return win;
}

// ── Route a farmflow:// URL to the renderer ───────────────────────────────────
function handleDeepLink(url) {
  if (!mainWin) return;
  try {
    const parsed = new URL(url); // e.g. farmflow://listing/abc123
    const linkPath = parsed.host + parsed.pathname; // "listing/abc123"
    mainWin.webContents.send('deep-link', linkPath);
  } catch (_) { /* ignore malformed URLs */ }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // ── Production protocol handler ──────────────────────────────────────────
  // Serves the React SPA and proxies /api/* + /uploads/* to the cloud backend.
  // This means zero changes to the React app: relative /api/ paths just work.
  if (!isDev) {
    protocol.handle('app', async (request) => {
      const url = new URL(request.url);

      // Proxy backend requests to the cloud Render deployment
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
        const backendUrl = `${BACKEND_ORIGIN}${url.pathname}${url.search}`;
        const headers = {};
        request.headers.forEach((v, k) => { headers[k] = v; });

        return net.fetch(backendUrl, {
          method:  request.method,
          headers,
          body:    ['GET', 'HEAD'].includes(request.method.toUpperCase())
                     ? undefined
                     : request.body,
          duplex: 'half',
        });
      }

      // Serve static React build — SPA fallback to index.html for client routes
      let filePath = path.join(distPath, url.pathname === '/' ? 'index.html' : url.pathname);
      // If path has no extension it is a client-side route → serve index.html
      if (!path.extname(filePath)) filePath = path.join(distPath, 'index.html');

      return net.fetch(`file://${filePath}`);
    });
  }

  registerFileIpc();

  // ── D6.3 Show splash, create main window, close splash on ready-to-show ──
  const splash = createSplash();
  mainWin = createWindow();

  mainWin.once('ready-to-show', () => {
    splash.destroy();
    mainWin.show();
    if (store.get('windowMaximized', false)) mainWin.maximize();
  });

  createTray(mainWin);
  registerNotifyIpc((n) => updateBadge(n));
  Menu.setApplicationMenu(buildMenu());
  initAutoUpdater();

  // macOS: show hidden window when dock icon is clicked, or re-create if none
  app.on('activate', () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length === 0) {
      mainWin = createWindow();
    } else {
      wins.find(w => !w.isDestroyed() && w !== splash)?.show();
    }
  });

  // ── D6.4 macOS deep link via open-url event ───────────────────────────────
  app.on('open-url', (_event, url) => {
    _event.preventDefault();
    handleDeepLink(url);
  });
});

// ── D6.5 Second-instance handler (focus + Windows deep-link) ─────────────────
app.on('second-instance', (event, commandLine) => {
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.show();
    mainWin.focus();
  }
  // Windows passes the URL in the command line args
  const deepLinkUrl = commandLine.find(arg => arg.startsWith('farmflow://'));
  if (deepLinkUrl) handleDeepLink(deepLinkUrl);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
