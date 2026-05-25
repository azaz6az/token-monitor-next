import { fetchDeepSeekBalance, fetchMiMoBalance, fetchTokenPlanBalance, getApiKeys } from '../api/clients';
import { insertBalance, insertRate } from '../db/database';
import { calculateRate, RateInfo } from './rate';
import { evaluateAlert, AlertState } from './alerts';

const POLL_INTERVAL = 30_000;
const RATE_RECORD_INTERVAL = 60_000;
const TOKENS_PER_YUAN = 100_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
// Track balance changes to estimate token consumption
const lastBalance: Record<string, number> = { deepseek: -1, mimo: -1, 'token-plan': -1 };
// Accumulated token delta between rate recordings
const pendingTokenDelta: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };
const lastRateRecordTime: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };
// Session total consumed tokens
const sessionTokensConsumed: Record<string, number> = { deepseek: 0, mimo: 0, 'token-plan': 0 };

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
  ];

  // MiMo and Token Plan both use platform cookie auth
  const hasPlatformCookie = keys.tokenPlanServiceToken && keys.tokenPlanUserId;

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

  // Poll MiMo (using platform cookie)
  if (hasPlatformCookie) {
    try {
      const data = await fetchMiMoBalance(keys.tokenPlanServiceToken!, keys.tokenPlanUserId!);

      const prevBal = lastBalance['mimo'];
      if (prevBal >= 0 && data.balance < prevBal) {
        const deltaYuan = prevBal - data.balance;
        const estimatedTokens = Math.round(deltaYuan * TOKENS_PER_YUAN);
        sessionTokensConsumed['mimo'] += estimatedTokens;
        pendingTokenDelta['mimo'] += estimatedTokens;
      }
      lastBalance['mimo'] = data.balance;

      insertBalance('mimo', data.balance, data.tokensUsed);

      const now = Date.now();
      const timeSinceLast = now - (lastRateRecordTime['mimo'] || now);
      if (timeSinceLast >= RATE_RECORD_INTERVAL) {
        if (lastRateRecordTime['mimo'] > 0 && pendingTokenDelta['mimo'] > 0) {
          const minutesElapsed = timeSinceLast / 60_000;
          const rate = Math.round(pendingTokenDelta['mimo'] / minutesElapsed);
          insertRate('mimo', rate);
        }
        pendingTokenDelta['mimo'] = 0;
        lastRateRecordTime['mimo'] = now;
      } else if (lastRateRecordTime['mimo'] === 0) {
        lastRateRecordTime['mimo'] = now;
      }

      const rateInfo = calculateRate('mimo', null, sessionTokensConsumed['mimo']);
      const alert = evaluateAlert('mimo', rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    } catch (err: any) {
      console.error('[TokenMonitor] Failed to poll mimo: ' + err.message);
      const rateInfo = calculateRate('mimo', '请求失败: ' + err.message);
      const alert = evaluateAlert('mimo', rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    }
  } else {
    const rateInfo = calculateRate('mimo', '未配置平台 Cookie');
    const alert = evaluateAlert('mimo', rateInfo.estimatedMinutesLeft);
    onData?.(rateInfo, alert);
  }

  // Poll Token Plan
  if (hasPlatformCookie) {
    try {
      const data = await fetchTokenPlanBalance(keys.tokenPlanServiceToken!, keys.tokenPlanUserId!);

      const prevBal = lastBalance['token-plan'];
      if (prevBal >= 0 && data.balance < prevBal) {
        const delta = prevBal - data.balance;
        sessionTokensConsumed['token-plan'] += Math.round(delta * 1000);
        pendingTokenDelta['token-plan'] += Math.round(delta * 1000);
      }
      lastBalance['token-plan'] = data.balance;

      insertBalance('token-plan', data.balance, data.tokensUsed);

      const now = Date.now();
      const timeSinceLast = now - (lastRateRecordTime['token-plan'] || now);
      if (timeSinceLast >= RATE_RECORD_INTERVAL) {
        if (lastRateRecordTime['token-plan'] > 0 && pendingTokenDelta['token-plan'] > 0) {
          const minutesElapsed = timeSinceLast / 60_000;
          const rate = Math.round(pendingTokenDelta['token-plan'] / minutesElapsed);
          insertRate('token-plan', rate);
        }
        pendingTokenDelta['token-plan'] = 0;
        lastRateRecordTime['token-plan'] = now;
      } else if (lastRateRecordTime['token-plan'] === 0) {
        lastRateRecordTime['token-plan'] = now;
      }

      const rateInfo = calculateRate('token-plan', null, sessionTokensConsumed['token-plan']);
      const alert = evaluateAlert('token-plan', rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    } catch (err: any) {
      console.error('[TokenMonitor] Failed to poll token-plan: ' + err.message);
      const rateInfo = calculateRate('token-plan', '请求失败: ' + err.message);
      const alert = evaluateAlert('token-plan', rateInfo.estimatedMinutesLeft);
      onData?.(rateInfo, alert);
    }
  } else {
    const rateInfo = calculateRate('token-plan', '未配置 Token Plan');
    const alert = evaluateAlert('token-plan', rateInfo.estimatedMinutesLeft);
    onData?.(rateInfo, alert);
  }
}

export function triggerManualRefresh(): void {
  poll();
}
