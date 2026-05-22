"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getApiKeys: () => electron_1.ipcRenderer.invoke('get-api-keys'),
    saveApiKeys: (keys) => electron_1.ipcRenderer.invoke('save-api-keys', keys),
    manualRefresh: () => electron_1.ipcRenderer.invoke('manual-refresh'),
    updateBalance: (service, newBalance) => electron_1.ipcRenderer.invoke('update-balance', service, newBalance),
    getHistory: (service) => electron_1.ipcRenderer.invoke('get-history', service),
    onTokenData: (callback) => {
        const handler = (_event, payload) => callback(payload);
        electron_1.ipcRenderer.on('token-data', handler);
        return () => { electron_1.ipcRenderer.removeListener('token-data', handler); };
    },
});
//# sourceMappingURL=preload.js.map