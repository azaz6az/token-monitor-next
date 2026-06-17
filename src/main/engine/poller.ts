import { fetchDeepSeekBalance, fetchMiMoBalance, fetchTokenPlanBalance, getApiKeys, ServiceBalance } from '../api/clients';
import { insertBalance, insertRate } from '../db/database';
import { calculateRate, RateInfo } from './rate';
import { evaluateAlert, AlertState } from './alerts';
import { POLL_INTERVAL_MS, RATE_RECORD_INTERVAL_MS, TOKENS_PER_YUAN, TOKEN_PLAN_TOKENS_PER_UNIT } from '../constants';

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Track balance changes to estimate token consumption (for rate/alerts)
const lastBalance: Record<string, number> = { deepseek: -1, mimo: -1, 'token-plan': -1 };
const pendingTokenDelta: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };
const lastRateRecordTime: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };
// 今日起始余额（用于计算今日消耗金额）
const todayStartBalance: Record<string, number> = { deepseek: -1, mimo: -1, 'token-plan': -1 };

export type DataCallback = (data: RateInfo, alert: AlertState) => void;
let onData: DataCallback | null = null;

// ── Service config ──────────────────────────────────────────────

interface ServiceConfig {
  name: string;
  enabled: boolean;
  fetch: () => Promise<ServiceBalance>;
  notConfiguredMsg: string;
  tokensPerUnit: number;
}

// ── Core poll logic (per service) ────────────────────────────────

async function pollService(svc: ServiceConfig): Promise<void> {
  if (!svc.enabled) {
    const rateInfo = calculateRate(svc.name, svc.notConfiguredMsg);
    const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
    onData?.(rateInfo, alert);
    return;
  }

  try {
    const data = await svc.fetch();

    // Track balance changes
    const prevBal = lastBalance[svc.name];
    if (prevBal >= 0 && data.balance < prevBal) {
      const delta = prevBal - data.balance;
      const estimatedTokens = Math.round(delta * svc.tokensPerUnit);
      pendingTokenDelta[svc.name] += estimatedTokens;
    }
    lastBalance[svc.name] = data.balance;

    // 记录今日起始余额
    if (todayStartBalance[svc.name] < 0) {
      todayStartBalance[svc.name] = data.balance;
    }
    const todayCost = Math.max(0, todayStartBalance[svc.name] - data.balance);

    insertBalance(svc.name, data.balance, data.tokensUsed);

    // Record rate every RATE_RECORD_INTERVAL
    const now = Date.now();
    const timeSinceLast = now - (lastRateRecordTime[svc.name] || now);

    if (timeSinceLast >= RATE_RECORD_INTERVAL_MS) {
      if (lastRateRecordTime[svc.name] > 0 && pendingTokenDelta[svc.name] > 0) {
        const minutesElapsed = timeSinceLast / 60_000;
        const rate = Math.round(pendingTokenDelta[svc.name] / minutesElapsed);
        insertRate(svc.name, rate);
      }
      pendingTokenDelta[svc.name] = 0;
      lastRateRecordTime[svc.name] = now;
    } else if (lastRateRecordTime[svc.name] === 0) {
      lastRateRecordTime[svc.name] = now;
    }

    const rateInfo = calculateRate(svc.name, null, todayCost);
    if (data.percentage !== undefined) rateInfo.percentage = data.percentage;
    const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
    onData?.(rateInfo, alert);
  } catch (err: any) {
    console.error(`[TokenMonitor] Failed to poll ${svc.name}: ${err.message}`);
    const rateInfo = calculateRate(svc.name, `请求失败: ${err.message}`);
    const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
    onData?.(rateInfo, alert);
  }
}

// ── Poll orchestration ───────────────────────────────────────────

async function poll(): Promise<void> {
  const keys = getApiKeys();
  const hasMimoCookies = !!keys.mimoCookies;

  const services: ServiceConfig[] = [
    {
      name: 'deepseek',
      enabled: !!keys.deepseekKey,
      fetch: () => fetchDeepSeekBalance(keys.deepseekKey!),
      notConfiguredMsg: '未配置 API Key',
      tokensPerUnit: TOKENS_PER_YUAN,
    },
    {
      name: 'mimo',
      enabled: hasMimoCookies,
      fetch: () => fetchMiMoBalance(keys.mimoCookies!),
      notConfiguredMsg: '未配置平台 Cookie',
      tokensPerUnit: TOKENS_PER_YUAN,
    },
    {
      name: 'token-plan',
      enabled: hasMimoCookies,
      fetch: () => fetchTokenPlanBalance(keys.mimoCookies!),
      notConfiguredMsg: '未配置 Token Plan',
      tokensPerUnit: TOKEN_PLAN_TOKENS_PER_UNIT,
    },
  ];

  for (const svc of services) {
    await pollService(svc);
  }
}

// ── Lifecycle ────────────────────────────────────────────────────

export function startPolling(callback: DataCallback): void {
  onData = callback;
  if (pollTimer) return;
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function triggerManualRefresh(): void {
  poll();
}
