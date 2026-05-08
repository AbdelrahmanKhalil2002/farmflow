const { Tray, Menu, nativeImage, app, BrowserWindow } = require('electron');
const path = require('path');

let tray = null;

// Build a small red circle badge overlay for the tray icon
function buildBadgeIcon(count) {
  const label = count > 99 ? '99+' : String(count);
  const size  = 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="8" cy="8" r="8" fill="#DC2626"/>
    <text x="8" y="${label.length > 2 ? 10 : 11}" text-anchor="middle"
          font-family="Arial" font-size="${label.length > 2 ? 7 : 9}"
          fill="white" font-weight="bold">${label}</text>
  </svg>`;
  return nativeImage.createFromDataURL(
    'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
  );
}

function focusOrShow(win) {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createTray(win) {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('FarmFlow');

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: 'فتح FarmFlow',
      click: () => focusOrShow(win),
    },
    { type: 'separator' },
    {
      label: 'خروج',
      click: () => {
        app._quitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => focusOrShow(win));

  // On Windows, a single click should also show the window
  if (process.platform === 'win32') {
    tray.on('click', () => focusOrShow(win));
  }

  return tray;
}

// Call inside win.on('close') to intercept and hide instead of quitting
function handleWindowClose(event, win) {
  if (app._quitting) return; // real quit — let it through
  event.preventDefault();
  win.hide();
}

function updateBadge(count) {
  if (!tray) return;
  const n = Math.max(0, parseInt(count, 10) || 0);
  if (n === 0) {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    tray.setImage(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
    tray.setToolTip('FarmFlow');
  } else {
    tray.setImage(buildBadgeIcon(n));
    tray.setToolTip(`FarmFlow — ${n} إشعارات غير مقروءة`);
  }
}

module.exports = { createTray, handleWindowClose, updateBadge };
