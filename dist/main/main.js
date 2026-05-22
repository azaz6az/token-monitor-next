"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const manager_1 = require("./windows/manager");
const handlers_1 = require("./ipc/handlers");
const poller_1 = require("./engine/poller");
const database_1 = require("./db/database");
electron_1.app.whenReady().then(() => {
    (0, handlers_1.registerIpcHandlers)();
    (0, manager_1.createMainWindow)();
    (0, poller_1.startPolling)((data, alert) => {
        const win = electron_1.BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && w.title !== '');
        if (win && !win.isDestroyed()) {
            win.webContents.send('token-data', { data, alert });
        }
        if (alert.level !== 'normal') {
            (0, manager_1.showBubble)(alert, data.service);
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    (0, poller_1.stopPolling)();
    electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    (0, poller_1.stopPolling)();
});
electron_1.app.on('will-quit', () => {
    (0, database_1.closeDb)();
});
//# sourceMappingURL=main.js.map