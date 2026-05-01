const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, narrow API to the renderer (React app).
// Only explicitly listed channels can be used — no raw ipcRenderer access.
contextBridge.exposeInMainWorld('electron', {
  // Read-only metadata
  platform:  process.platform,   // 'darwin' | 'win32' | 'linux'
  isDesktop: true,               // React code uses window.electron?.isDesktop

  // ── Phase 2: File export ─────────────────────────────────────────────────
  // saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  // openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // ── Phase 3: OS notifications / tray badge ───────────────────────────────
  // notify:   (title, body) => ipcRenderer.invoke('notify', { title, body }),
  // setBadge: (count) => ipcRenderer.invoke('set-badge', count),

  // ── Phase 3: Keyboard shortcut overrides (sent from main → renderer) ────
  // onShortcut: (cb) => ipcRenderer.on('shortcut', (_, key) => cb(key)),
});
