import { getRecentRates, getLatestBalance } from '../db/database';
import { TOKENS_PER_YUAN } from '../constants';

export interface RateInfo {
  service: string;
  currentRate: number;
  recentRates: number[];
  estimatedMinutesLeft: number;
  balance: number;
  tokensUsed: number;
  todayCost: number;
  error: string | null;
  lastUpdated: number;
  /** 百分比（Token Plan 专用） */
  percentage?: number;
}

export function calculateRate(
  service: string,
  error: string | null = null,
  todayCost: number = 0,
): RateInfo {
  const latestBalance = getLatestBalance(service);
  const balance = latestBalance?.balance ?? 0;
  const tokensUsed = latestBalance?.tokens_used ?? 0;

  const records = getRecentRates(service, 5);
  const recentRates = records.map(r => r.tokens_per_minute);

  const base = { service, error, lastUpdated: Date.now(), todayCost };

  if (recentRates.length === 0) {
    return { ...base, currentRate: 0, recentRates: [], estimatedMinutesLeft: Infinity, balance, tokensUsed };
  }

  const currentRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
  const estimatedTokensLeft = balance * TOKENS_PER_YUAN;
  const estimatedMinutesLeft = currentRate > 0 ? estimatedTokensLeft / currentRate : Infinity;

  return { ...base, currentRate, recentRates, estimatedMinutesLeft, balance, tokensUsed };
}
