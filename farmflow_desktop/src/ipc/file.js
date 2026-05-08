const { ipcMain, dialog, shell, BrowserWindow } = require('electron');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

function getFilters(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.csv') return [{ name: 'CSV Files', extensions: ['csv'] }];
  if (ext === '.pdf') return [{ name: 'PDF Files', extensions: ['pdf'] }];
  return [{ name: 'All Files', extensions: ['*'] }];
}

function registerFileIpc() {
  // save-file: renderer sends { filename, buffer, defaultPath }
  // main opens native Save dialog, writes file, returns { success, filePath }
  ipcMain.handle('save-file', async (_event, { filename, buffer, defaultPath }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: defaultPath || path.join(os.homedir(), 'Desktop', filename),
      filters: getFilters(filename),
    });
    if (canceled || !filePath) return { success: false };
    await fs.promises.writeFile(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  });

  // open-file: opens a saved file with the OS default application
  ipcMain.handle('open-file', async (_event, filePath) => {
    const err = await shell.openPath(filePath);
    return { success: !err, error: err || null };
  });

  // save-pdf: renderer sends { html, filename }
  // main renders HTML in a hidden window, exports PDF via printToPDF, saves to disk
  ipcMain.handle('save-pdf', async (_event, { html, filename }) => {
    const tmpFile = path.join(os.tmpdir(), `farmflow-pdf-${Date.now()}.html`);
    await fs.promises.writeFile(tmpFile, html, 'utf8');

    const hidden = new BrowserWindow({
      show: false,
      webPreferences: { javascript: true, nodeIntegration: false },
    });

    await hidden.loadFile(tmpFile);
    await new Promise(resolve => hidden.webContents.once('did-finish-load', resolve));

    const pdfBuffer = await hidden.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: true,
    });
    hidden.close();
    await fs.promises.unlink(tmpFile).catch(() => {});

    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: path.join(os.homedir(), 'Desktop', filename),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { success: false };
    await fs.promises.writeFile(filePath, pdfBuffer);
    return { success: true, filePath };
  });
}

module.exports = { registerFileIpc };
