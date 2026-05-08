const { Menu, app, BrowserWindow } = require('electron');

const isMac = process.platform === 'darwin';

function send(channel, data) {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send(channel, data);
}

function buildMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'ملف',
      submenu: [
        {
          label: 'تصدير CSV',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => send('menu-action', { type: 'export-csv' }),
        },
        {
          label: 'تصدير PDF',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => send('menu-action', { type: 'export-pdf' }),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'خروج' },
      ],
    },
    {
      label: 'تعديل',
      submenu: [
        { role: 'undo',      label: 'تراجع' },
        { role: 'redo',      label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut',       label: 'قص' },
        { role: 'copy',      label: 'نسخ' },
        { role: 'paste',     label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload',          label: 'إعادة التحميل' },
        { role: 'forceReload',     label: 'إعادة تحميل قسري' },
        { role: 'toggleDevTools',  label: 'أدوات المطور' },
        { type: 'separator' },
        { role: 'resetZoom',       label: 'الحجم الافتراضي' },
        { role: 'zoomIn',          label: 'تكبير' },
        { role: 'zoomOut',         label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'شاشة كاملة' },
      ],
    },
    {
      label: 'نافذة',
      role: 'window',
      submenu: [
        { role: 'minimize', label: 'تصغير' },
        { role: 'zoom',     label: 'تكبير' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }]
          : [{ role: 'close', label: 'إغلاق' }]
        ),
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
