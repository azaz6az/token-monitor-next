import { app, BrowserWindow } from 'electron';
import { createMainWindow, showBubble } from './windows/manager';
import { registerIpcHandlers } from './ipc/handlers';
import { startPolling, stopPolling } from './engine/poller';
import { closeDb } from './db/database';
import { AlertState } from './engine/alerts';
import { RateInfo } from './engine/rate';
import { setIsQuitting } from './state';

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  startPolling((data: RateInfo, alert: AlertState) => {
    const win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
    if (win && !win.isDestroyed()) {
      win.webContents.send('token-data', { data, alert });
    }
    if (alert.level !== 'normal' && !data.error) {
      showBubble(alert, data.service);
    }
  });
});

// 关闭所有窗口时不退出，保持托盘运行
app.on('window-all-closed', () => {
  // 不调用 app.quit()，应用继续在托盘中运行
});

app.on('before-quit', () => {
  setIsQuitting(true);
  stopPolling();
});

app.on('will-quit', () => {
  closeDb();
});
