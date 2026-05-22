import { fetchDeepSeekBalance, fetchMiMoBalance, getApiKeys } from '../api/clients';
import { insertBalance, insertRate } from '../db/database';
import { calculateRate, RateInfo } from './rate';
import { evaluateAlert, AlertState } from './alerts';

const POLL_INTERVAL = 30_000;
const RATE_RECORD_INTERVAL = 60_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
const lastTokensUsed: Record<string, number> = { deepseek: 0, mimo: 0 };
const lastRateRecordTime: Record<string, number> = { deepseek: 0, mimo: 0 };

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
    if (!svc.key) continue;
    try {
      const data = await svc.fetcher(svc.key);
      insertBalance(data.service, data.balance, data.tokensUsed);

      const now = Date.now();
      const prevTokens = lastTokensUsed[data.service] ?? data.tokensUsed;
      const timeSinceLast = now - (lastRateRecordTime[data.service] ?? now);

      if (timeSinceLast >= RATE_RECORD_INTERVAL && prevTokens > 0) {
        const tokensDelta = Math.max(0, data.tokensUsed - prevTokens);
        const minutesElapsed = timeSinceLast / 60_000;
        const rate = tokensDelta / minutesElapsed;
        insertRate(data.service, Math.round(rate));
        lastTokensUsed[data.service] = data.tokensUsed;
        lastRateRecordTime[data.service] = now;
      } else if (prevTokens === 0) {
        lastTokensUsed[data.service] = data.tokensUsed;
        lastRateRecordTime[data.service] = now;
      }

      const rateInfo = calculateRate(data.service);
      const alert = evaluateAlert(data.service, rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    } catch (err) {
      console.error(`Failed to poll ${svc.name}:`, err);
      const rateInfo = calculateRate(svc.name);
      const alert = evaluateAlert(svc.name, rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    }
  }
}

export function triggerManualRefresh(): void {
  poll();
}
