"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const clients_1 = require("../api/clients");
const poller_1 = require("../engine/poller");
const database_1 = require("../db/database");
function registerIpcHandlers() {
    electron_1.ipcMain.handle('get-api-keys', () => {
        return (0, clients_1.getApiKeys)();
    });
    electron_1.ipcMain.handle('save-api-keys', (_event, keys) => {
        (0, clients_1.saveApiKeys)(keys);
        (0, poller_1.triggerManualRefresh)();
        return { success: true };
    });
    electron_1.ipcMain.handle('manual-refresh', () => {
        (0, poller_1.triggerManualRefresh)();
        return { success: true };
    });
    electron_1.ipcMain.handle('update-balance', (_event, service, newBalance) => {
        const latest = (0, database_1.getLatestBalance)(service);
        if (latest) {
            (0, database_1.insertBalance)(service, newBalance, latest.tokens_used);
            (0, poller_1.triggerManualRefresh)();
        }
        return { success: true };
    });
    electron_1.ipcMain.handle('get-history', (_event, service) => {
        return (0, database_1.getRecentRates)(service, 5);
    });
}
//# sourceMappingURL=handlers.js.map