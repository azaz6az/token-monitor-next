import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKeys: (): Promise<{ deepseek?: string; mimo?: string; tokenPlanServiceToken?: string; tokenPlanUserId?: string }> =>
    ipcRenderer.invoke('get-api-keys'),
  saveApiKeys: (keys: { deepseek?: string; mimo?: string; tokenPlanServiceToken?: string; tokenPlanUserId?: string }): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-api-keys', keys),
  manualRefresh: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('manual-refresh'),
  updateBalance: (service: string, newBalance: number): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('update-balance', service, newBalance),
  getHistory: (service: string): Promise<{ tokens_per_minute: number; recorded_at: string }[]> =>
    ipcRenderer.invoke('get-history', service),
  onTokenData: (callback: (payload: unknown) => void): (() => void) => {
    const handler = (_event: unknown, payload: unknown): void => callback(payload);
    ipcRenderer.on('token-data', handler);
    return () => { ipcRenderer.removeListener('token-data', handler); };
  },
});
