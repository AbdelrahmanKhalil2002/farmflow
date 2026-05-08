const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer (React app).
// Only explicitly listed channels can be used — no raw ipcRenderer access.
contextBridge.exposeInMainWorld('electron', {
  // Read-only metadata
  platform:  process.platform,   // 'darwin' | 'win32' | 'linux'
  isDesktop: true,               // React code uses window.electron?.isDesktop

  // ── Phase 2: File export ─────────────────────────────────────────────────
  saveFile: (opts)     => ipcRenderer.invoke('save-file', opts),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  savePdf:  (opts)     => ipcRenderer.invoke('save-pdf',  opts),

  // ── Phase 3: OS notifications / tray badge ───────────────────────────────
  notify:   (title, body) => ipcRenderer.invoke('notify',    { title, body }),
  setBadge: (count)       => ipcRenderer.invoke('set-badge', count),

  // ── Phase 3: Menu actions (File > Export CSV / PDF) ─────────────────────
  // Returns an unsubscribe function so React can clean up on unmount.
  onMenuAction: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.off('menu-action', handler);
  },

  // ── Phase 6 D6.4: farmflow:// deep-link routing ──────────────────────────
  // cb receives a path string like "listing/abc123" or "order/xyz"
  onDeepLink: (cb) => {
    const handler = (_, linkPath) => cb(linkPath);
    ipcRenderer.on('deep-link', handler);
    return () => ipcRenderer.off('deep-link', handler);
  },
});
