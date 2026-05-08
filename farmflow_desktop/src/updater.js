const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'تحديث متاح',
    message: 'يتوفر إصدار جديد من FarmFlow وسيتم تنزيله في الخلفية.',
    buttons: ['حسنًا'],
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'جاهز للتثبيت',
    message: 'تم تنزيل تحديث FarmFlow. هل تريد إعادة التشغيل الآن لتطبيقه؟',
    buttons: ['إعادة التشغيل', 'لاحقًا'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  // Silent in production — update errors shouldn't interrupt the user
  console.error('[updater]', err?.message);
});

function initAutoUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdates();
}

module.exports = { initAutoUpdater };
