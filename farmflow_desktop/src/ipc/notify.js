const { ipcMain, Notification, app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

const ICON = path.join(__dirname, '../../assets/icon.png');

// Build a small red-circle PNG badge for Windows taskbar overlay
function buildBadgeImage(count) {
  const label  = count > 99 ? '99+' : String(count);
  const size   = 16;
  const svg    = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="8" cy="8" r="8" fill="#DC2626"/>
    <text x="8" y="${label.length > 2 ? 10 : 11}" text-anchor="middle"
          font-family="Arial" font-size="${label.length > 2 ? 7 : 9}"
          fill="white" font-weight="bold">${label}</text>
  </svg>`;
  return nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
  );
}

function registerNotifyIpc(onBadgeChange) {
  // Show a native OS notification
  ipcMain.handle('notify', (_event, { title, body }) => {
    if (!Notification.isSupported()) return;
    new Notification({ title, body, icon: ICON }).show();
  });

  // Update dock badge (macOS), taskbar overlay (Windows), and tray icon
  ipcMain.handle('set-badge', (_event, count) => {
    const n = Math.max(0, parseInt(count, 10) || 0);

    if (onBadgeChange) onBadgeChange(n);

    if (process.platform === 'darwin') {
      app.setBadgeCount(n);
      return;
    }

    if (process.platform === 'win32') {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      if (n === 0) {
        win.setOverlayIcon(null, '');
      } else {
        win.setOverlayIcon(buildBadgeImage(n), `${n} إشعارات غير مقروءة`);
      }
    }
  });
}

module.exports = { registerNotifyIpc };
