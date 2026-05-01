const { app, BrowserWindow, shell, protocol, net } = require('electron');
const path = require('path');
const Store = require('electron-store');

const isDev = !app.isPackaged;

// Path to the React build used in production
const distPath = isDev
  ? null
  : path.join(process.resourcesPath, 'frontend', 'dist');

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

// ── Window state store ────────────────────────────────────────────────────────
const store = new Store();

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  const saved = store.get('windowBounds', { width: 1400, height: 900 });

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
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      !isDev, // relax only in dev so Vite HMR works
    },
  });

  // ── Load content ───────────────────────────────────────────────────────────
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadURL('app://localhost/');
  }

  // Show window when first paint is done
  win.once('ready-to-show', () => {
    win.show();
    if (store.get('windowMaximized', false)) win.maximize();
  });

  // Persist window bounds on close
  win.on('close', () => {
    store.set('windowMaximized', win.isMaximized());
    if (!win.isMaximized() && !win.isMinimized()) {
      store.set('windowBounds', win.getBounds());
    }
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

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // ── Production protocol handler ──────────────────────────────────────────
  // Serves the React SPA and proxies /api/* + /uploads/* to the local backend.
  // This means zero changes to the React app: relative /api/ paths just work.
  if (!isDev) {
    protocol.handle('app', async (request) => {
      const url = new URL(request.url);

      // Proxy backend requests
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
        const backendUrl = `http://localhost:5001${url.pathname}${url.search}`;
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

  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
