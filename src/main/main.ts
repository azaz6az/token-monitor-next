import { app } from 'electron';
import { createMainWindow, showBubble, getMainWindow, setTrayTitle } from './windows/manager';
import { registerIpcHandlers } from './ipc/handlers';
import { startPolling, stopPolling } from './engine/poller';
import { closeDb } from './db/database';
import { AlertState } from './engine/alerts';
import { RateInfo } from './engine/rate';
import { setIsQuitting } from './state';

// 上次各服务数据，用于任务栏文字
const lastBalances: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };
const lastPct: Record<string, number> = {};

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  startPolling((data: RateInfo, alert: AlertState) => {
    const win = getMainWindow();
    // 窗口隐藏时不推送数据，省 CPU
    if (win && !win.isDestroyed() && win.isVisible()) {
      win.webContents.send('token-data', { data, alert });
    }

    // 更新任务栏文字（极简模式）
    if (!data.error) {
      lastBalances[data.service] = data.balance;
      if (data.percentage !== undefined) lastPct[data.service] = data.percentage;
    }
    const ds = lastBalances['deepseek'];
    const mm = lastBalances['mimo'];
    const tpPct = lastPct['token-plan'];
    const parts: string[] = [];
    if (ds > 0) parts.push(`¥${ds.toFixed(0)}`);
    if (mm > 0) parts.push(`¥${mm.toFixed(0)}`);
    if (tpPct !== undefined) parts.push(`${tpPct}%`);
    setTrayTitle(parts.length ? parts.join(' ') : '');

    if (alert.level !== 'normal' && !data.error) {
      showBubble(alert, data.service);
    }
  });
});

app.on('window-all-closed', () => {});
app.on('before-quit', () => { setIsQuitting(true); stopPolling(); });
app.on('will-quit', () => { closeDb(); });
