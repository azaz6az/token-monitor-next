import { ipcMain } from 'electron';
import { getApiKeys, saveApiKeys, captureMiMoCookies } from '../api/clients';
import { triggerManualRefresh } from '../engine/poller';
import { getLatestBalance, insertBalance, getRecentRates } from '../db/database';

export function registerIpcHandlers(): void {
  ipcMain.handle('get-api-keys', () => {
    return getApiKeys();
  });

  ipcMain.handle('save-api-keys', (_event, keys: { deepseekKey?: string; mimoCookies?: string }) => {
    saveApiKeys(keys);
    triggerManualRefresh();
    return { success: true };
  });

  ipcMain.handle('manual-refresh', () => {
    triggerManualRefresh();
    return { success: true };
  });

  ipcMain.handle('update-balance', (_event, service: string, newBalance: number) => {
    const latest = getLatestBalance(service);
    if (latest) {
      insertBalance(service, newBalance, latest.tokens_used);
      triggerManualRefresh();
    }
    return { success: true };
  });

  ipcMain.handle('get-history', (_event, service: string) => {
    return getRecentRates(service, 5);
  });

  ipcMain.handle('capture-mimo', async () => {
    const ok = await captureMiMoCookies();
    return { success: ok };
  });
}
