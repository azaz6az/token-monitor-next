"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeys = getApiKeys;
exports.saveApiKeys = saveApiKeys;
exports.fetchDeepSeekBalance = fetchDeepSeekBalance;
exports.fetchMiMoBalance = fetchMiMoBalance;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_2 = require("electron");
// 注意：KEYS_FILE 必须延迟初始化，因为 app.getPath('userData') 只能在 app ready 后调用
function getKeysFilePath() {
    return path_1.default.join(electron_2.app.getPath('userData'), 'api-keys.enc');
}
function loadKeys() {
    const keysFile = getKeysFilePath();
    try {
        // 优先使用加密存储
        if (electron_1.safeStorage.isEncryptionAvailable() && fs_1.default.existsSync(keysFile)) {
            const encrypted = fs_1.default.readFileSync(keysFile);
            const decrypted = electron_1.safeStorage.decryptString(encrypted);
            return JSON.parse(decrypted);
        }
        // 回退：读取明文文件
        const plainFile = keysFile + '.plain';
        if (fs_1.default.existsSync(plainFile)) {
            const raw = fs_1.default.readFileSync(plainFile, 'utf-8');
            return JSON.parse(raw);
        }
    }
    catch (err) {
        if (err?.code !== 'ENOENT') {
            console.error('Failed to load API keys:', err);
        }
    }
    return {};
}
function getApiKeys() {
    return loadKeys();
}
function saveApiKeys(keys) {
    const keysFile = getKeysFilePath();
    if (!electron_1.safeStorage.isEncryptionAvailable()) {
        fs_1.default.writeFileSync(keysFile + '.plain', JSON.stringify(keys));
        return;
    }
    const encrypted = electron_1.safeStorage.encryptString(JSON.stringify(keys));
    fs_1.default.writeFileSync(keysFile, encrypted);
}
async function fetchDeepSeekBalance(apiKey) {
    const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
        throw new Error(`DeepSeek API error: ${res.status}`);
    const data = await res.json();
    return {
        service: 'deepseek',
        balance: data.balance ?? data.currency_balance ?? 0,
        tokensUsed: data.total_tokens ?? data.usage?.total_tokens ?? 0,
    };
}
async function fetchMiMoBalance(apiKey) {
    const res = await fetch('https://mimo.xiaomi.com/api/v1/account/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok)
        throw new Error(`MiMo API error: ${res.status}`);
    const data = await res.json();
    return {
        service: 'mimo',
        balance: data.balance ?? data.credit ?? 0,
        tokensUsed: data.used_tokens ?? data.usage?.total ?? 0,
    };
}
//# sourceMappingURL=clients.js.map