import { app, BrowserWindow } from 'electron';
import { createMainWindow, showBubble } from './windows/manager';
import { registerIpcHandlers } from './ipc/handlers';
import { startPolling, stopPolling } from './engine/poller';
import { closeDb } from './db/database';
import { AlertState } from './engine/alerts';
import { RateInfo } from './engine/rate';

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  startPolling((data: RateInfo, alert: AlertState) => {
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.title !== '');
    if (win && !win.isDestroyed()) {
      win.webContents.send('token-data', { data, alert });
    }
    if (alert.level !== 'normal') {
      showBubble(alert, data.service);
    }
  });
});

app.on('window-all-closed', () => {
  stopPolling();
  app.quit();
});

app.on('before-quit', () => {
  stopPolling();
});

app.on('will-quit', () => {
  closeDb();
});
