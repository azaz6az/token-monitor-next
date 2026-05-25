import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface ServiceBalance {
  service: string;
  balance: number;
  tokensUsed: number;
}

interface ApiKeyStore {
  deepseek?: string;
  mimo?: string;
  tokenPlanServiceToken?: string;
  tokenPlanUserId?: string;
}

// 注意：KEYS_FILE 必须延迟初始化，因为 app.getPath('userData') 只能在 app ready 后调用
function getKeysFilePath(): string {
  return path.join(app.getPath('userData'), 'api-keys.enc');
}

function loadKeys(): ApiKeyStore {
  const keysFile = getKeysFilePath();
  try {
    // 优先使用加密存储
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(keysFile)) {
      const encrypted = fs.readFileSync(keysFile);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    }
    // 回退：读取明文文件
    const plainFile = keysFile + '.plain';
    if (fs.existsSync(plainFile)) {
      const raw = fs.readFileSync(plainFile, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.error('Failed to load API keys:', err);
    }
  }
  return {};
}

export function getApiKeys(): ApiKeyStore {
  return loadKeys();
}

export function saveApiKeys(keys: ApiKeyStore): void {
  const keysFile = getKeysFilePath();
  if (!safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(keysFile + '.plain', JSON.stringify(keys));
    return;
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(keys));
  fs.writeFileSync(keysFile, encrypted);
}

export async function fetchDeepSeekBalance(apiKey: string): Promise<ServiceBalance> {
  const res = await fetch('https://api.deepseek.com/user/balance', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
  const data = await res.json() as any;
  // DeepSeek balance API returns: { is_available, balance_infos: [{ currency, total_balance, ... }] }
  let balance = 0;
  if (data.balance_infos && data.balance_infos.length > 0) {
    for (const info of data.balance_infos) {
      const b = parseFloat(info.total_balance) || 0;
      balance += b;
    }
  }
  // Fallback to older format
  if (balance === 0) {
    balance = parseFloat(data.balance) || parseFloat(data.currency_balance) || 0;
  }

  return {
    service: 'deepseek',
    balance,
    tokensUsed: data.total_tokens ?? data.usage?.total_tokens ?? 0,
  };
}

export async function fetchMiMoBalance(serviceToken: string, userId: string): Promise<ServiceBalance> {
  const res = await fetch('https://platform.xiaomimimo.com/api/v1/balance', {
    headers: {
      Cookie: `api-platform_serviceToken="${serviceToken}"; userId=${userId}`,
    },
  });
  if (!res.ok) throw new Error(`MiMo API error: ${res.status}`);
  const json = await res.json() as any;
  const data = json.data;
  return {
    service: 'mimo',
    balance: parseFloat(data?.balance) || 0,
    tokensUsed: 0,
  };
}

export async function fetchTokenPlanBalance(serviceToken: string, userId: string): Promise<ServiceBalance> {
  const res = await fetch('https://platform.xiaomimimo.com/api/v1/tokenPlan/usage', {
    headers: {
      Cookie: `api-platform_serviceToken="${serviceToken}"; userId=${userId}`,
    },
  });
  if (!res.ok) throw new Error(`Token Plan API error: ${res.status}`);
  const json = await res.json() as any;
  const data = json.data;

  // 套餐额度 (Credits)
  const planItem = data?.usage?.items?.find((i: any) => i.name === 'plan_total_token');
  const limit = planItem?.limit ?? 0;
  const used = planItem?.used ?? 0;
  const TOKENS_PER_YUAN = 100_000;

  return {
    service: 'token-plan',
    balance: limit > 0 ? (limit - used) / TOKENS_PER_YUAN : 0, // 转换为"元"单位，与 rate 计算兼容
    tokensUsed: used,
  };
}
