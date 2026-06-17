import { safeStorage, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { TOKENS_PER_YUAN } from '../constants';

interface ServiceBalance {
  service: string;
  balance: number;
  tokensUsed: number;
  percentage?: number;
}

export type { ServiceBalance };

interface ApiKeyStore {
  deepseekKey?: string;
  mimoCookies?: string;
}

// ── 密钥持久化 ──────────────────────────────────────────────────

function getKeysFilePath(): string {
  return path.join(app.getPath('userData'), 'api-keys.enc');
}

let cachedKeys: ApiKeyStore | null = null;

function loadKeys(): ApiKeyStore {
  const keysFile = getKeysFilePath();
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(keysFile)) {
      const encrypted = fs.readFileSync(keysFile);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    }
    const plainFile = keysFile + '.plain';
    if (fs.existsSync(plainFile)) {
      const raw = fs.readFileSync(plainFile, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') console.error('Failed to load API keys:', err);
  }
  return {};
}

export function getApiKeys(): ApiKeyStore {
  if (cachedKeys) return cachedKeys;
  cachedKeys = loadKeys();
  return cachedKeys;
}

export function saveApiKeys(keys: ApiKeyStore): void {
  cachedKeys = { ...keys };
  const keysFile = getKeysFilePath();
  if (!safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(keysFile + '.plain', JSON.stringify(keys));
    return;
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(keys));
  fs.writeFileSync(keysFile, encrypted);
}

// ── MiMo 平台 Cookie 自动捕获 ──────────────────────────────────

export function captureMiMoCookies(): Promise<boolean> {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      title: '登录 MiMo 开放平台 — 登录后关闭窗口即可',
      autoHideMenuBar: true,
    });
    const session = win.webContents.session;
    win.on('closed', () => {
      session.cookies.get({})
        .then(cookies => {
          const filtered = cookies.filter(c => c.domain?.includes('xiaomimimo'));
          if (filtered.length === 0) { resolve(false); return; }
          const all = filtered.map(c => `${c.name}=${c.value}`).join('; ');
          const keys = getApiKeys();
          keys.mimoCookies = all;
          saveApiKeys(keys);
          console.log('[Auth] MiMo: ' + filtered.length + ' cookies saved');
          const { triggerManualRefresh } = require('../engine/poller');
          triggerManualRefresh();
          resolve(true);
        })
        .catch(() => resolve(false));
    });
    win.loadURL('https://platform.xiaomimimo.com/console/balance');
  });
}

// ── 余额获取 ────────────────────────────────────────────────────

export async function fetchDeepSeekBalance(apiKey: string): Promise<ServiceBalance> {
  const res = await fetch('https://api.deepseek.com/user/balance', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
  const data = await res.json() as any;
  let balance = 0;
  if (data.balance_infos && data.balance_infos.length > 0) {
    for (const info of data.balance_infos) {
      balance += parseFloat(info.total_balance) || 0;
    }
  }
  if (balance === 0) {
    balance = parseFloat(data.balance) || parseFloat(data.currency_balance) || 0;
  }
  return {
    service: 'deepseek',
    balance,
    tokensUsed: data.total_tokens ?? data.usage?.total_tokens ?? 0,
  };
}

export async function fetchMiMoBalance(mimoCookies: string): Promise<ServiceBalance> {
  const res = await fetch('https://platform.xiaomimimo.com/api/v1/balance', {
    headers: { Cookie: mimoCookies },
  });
  if (!res.ok) throw new Error(`MiMo API error: ${res.status}`);
  const json = await res.json() as any;
  return {
    service: 'mimo',
    balance: parseFloat(json.data?.balance) || 0,
    tokensUsed: 0,
  };
}

export async function fetchTokenPlanBalance(mimoCookies: string): Promise<ServiceBalance> {
  const res = await fetch('https://platform.xiaomimimo.com/api/v1/tokenPlan/usage', {
    headers: { Cookie: mimoCookies },
  });
  if (!res.ok) throw new Error(`Token Plan API error: ${res.status}`);
  const json = await res.json() as any;
  const data = json.data;
  const planItem = data?.usage?.items?.find((i: any) => i.name === 'plan_total_token');
  const limit = planItem?.limit ?? 0;
  const used = planItem?.used ?? 0;
  return {
    service: 'token-plan',
    balance: limit > 0 ? (limit - used) / TOKENS_PER_YUAN : 0,
    tokensUsed: used,
    percentage: limit > 0 ? Math.round(((limit - used) / limit) * 100) : 0,
  };
}
