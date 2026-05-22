import { fetchDeepSeekBalance, fetchMiMoBalance, getApiKeys } from '../api/clients';
import { insertBalance, insertRate } from '../db/database';
import { calculateRate, RateInfo } from './rate';
import { evaluateAlert, AlertState } from './alerts';

const POLL_INTERVAL = 30_000;
const RATE_RECORD_INTERVAL = 60_000;
const TOKENS_PER_YUAN = 100_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
// Track balance changes to estimate token consumption
const lastBalance: Record<string, number> = { deepseek: -1, mimo: -1 };
// Accumulated token delta between rate recordings
const pendingTokenDelta: Record<string, number> = { deepseek: 0, mimo: 0 };
const lastRateRecordTime: Record<string, number> = { deepseek: 0, mimo: 0 };
// Session total consumed tokens
const sessionTokensConsumed: Record<string, number> = { deepseek: 0, mimo: 0 };

export type DataCallback = (data: RateInfo, alert: AlertState) => void;
let onData: DataCallback | null = null;

export function startPolling(callback: DataCallback): void {
  onData = callback;
  if (pollTimer) return;
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL);
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function poll(): Promise<void> {
  const keys = getApiKeys();
  const services: { name: string; key?: string; fetcher: (k: string) => Promise<{ service: string; balance: number; tokensUsed: number }> }[] = [
    { name: 'deepseek', key: keys.deepseek, fetcher: fetchDeepSeekBalance },
    { name: 'mimo', key: keys.mimo, fetcher: fetchMiMoBalance },
  ];

  for (const svc of services) {
    if (!svc.key) {
      const rateInfo = calculateRate(svc.name, '未配置 API Key');
      const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
      continue;
    }
    try {
      const data = await svc.fetcher(svc.key);

      // Track balance changes → estimate token consumption
      const prevBal = lastBalance[data.service];
      if (prevBal >= 0 && data.balance < prevBal) {
        const deltaYuan = prevBal - data.balance;
        const estimatedTokens = Math.round(deltaYuan * TOKENS_PER_YUAN);
        sessionTokensConsumed[data.service] += estimatedTokens;
        pendingTokenDelta[data.service] += estimatedTokens;
      }
      lastBalance[data.service] = data.balance;

      insertBalance(data.service, data.balance, data.tokensUsed);

      // Record rate every RATE_RECORD_INTERVAL based on balance changes
      const now = Date.now();
      const timeSinceLast = now - (lastRateRecordTime[data.service] || now);

      if (timeSinceLast >= RATE_RECORD_INTERVAL) {
        if (lastRateRecordTime[data.service] > 0 && pendingTokenDelta[data.service] > 0) {
          const minutesElapsed = timeSinceLast / 60_000;
          const rate = Math.round(pendingTokenDelta[data.service] / minutesElapsed);
          insertRate(data.service, rate);
        }
        pendingTokenDelta[data.service] = 0;
        lastRateRecordTime[data.service] = now;
      } else if (lastRateRecordTime[data.service] === 0) {
        lastRateRecordTime[data.service] = now;
      }

      const rateInfo = calculateRate(data.service, null, sessionTokensConsumed[data.service]);
      const alert = evaluateAlert(data.service, rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    } catch (err: any) {
      console.error('[TokenMonitor] Failed to poll ' + svc.name + ': ' + err.message);
      const rateInfo = calculateRate(svc.name, '请求失败: ' + err.message);
      const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    }
  }
}

export function triggerManualRefresh(): void {
  poll();
}
