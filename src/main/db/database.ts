import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface BalanceRow {
  balance: number;
  tokens_used: number;
  recorded_at: string;
}

interface RateRow {
  tokens_per_minute: number;
  recorded_at: string;
}

interface AlertRow {
  triggered_at: string;
}

interface Store {
  balances: Record<string, BalanceRow[]>;
  rates: Record<string, RateRow[]>;
  alerts: Record<string, AlertRow[]>;
}

function defaultStore(): Store {
  return { balances: {}, rates: {}, alerts: {} };
}

let store: Store | null = null;

function getDataPath(): string {
  return path.join(app.getPath('userData'), 'token-monitor-data.json');
}

function loadStore(): Store {
  if (store) return store;
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8');
    store = JSON.parse(raw);
    return store!;
  } catch {
    store = defaultStore();
    return store;
  }
}

function saveStore(): void {
  if (!store) return;
  try {
    fs.writeFileSync(getDataPath(), JSON.stringify(store));
  } catch (err) {
    console.error('[DB] Failed to save:', err);
  }
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function cleanOld<T extends { recorded_at?: string; triggered_at?: string }>(
  records: T[],
  timeField: string,
): T[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return records.filter(r => {
    const ts = (r as any)[timeField];
    if (!ts) return true;
    return new Date(ts + 'Z').getTime() > cutoff;
  });
}

// Init
loadStore();

export function insertBalance(service: string, balance: number, tokensUsed: number): void {
  const s = loadStore();
  if (!s.balances[service]) s.balances[service] = [];
  s.balances[service].push({ balance, tokens_used: tokensUsed, recorded_at: now() });
  s.balances[service] = cleanOld(s.balances[service], 'recorded_at');
  saveStore();
}

export function insertRate(service: string, tokensPerMinute: number): void {
  const s = loadStore();
  if (!s.rates[service]) s.rates[service] = [];
  s.rates[service].push({ tokens_per_minute: tokensPerMinute, recorded_at: now() });
  s.rates[service] = cleanOld(s.rates[service], 'recorded_at');
  saveStore();
}

export function insertAlert(service: string, level: string, _message: string): void {
  const s = loadStore();
  if (!s.alerts[service]) s.alerts[service] = [];
  const entry: any = { triggered_at: now(), level };
  s.alerts[service].push(entry);
  s.alerts[service] = cleanOld(s.alerts[service], 'triggered_at');
  saveStore();
}

export function getLatestBalance(service: string): BalanceRow | null {
  const s = loadStore();
  const arr = s.balances[service];
  if (!arr || arr.length === 0) return null;
  return arr[arr.length - 1];
}

export function getRecentRates(service: string, limit: number = 5): RateRow[] {
  const s = loadStore();
  const arr = s.rates[service];
  if (!arr || arr.length === 0) return [];
  return arr.slice(-limit).reverse();
}

export function getLastAlert(service: string, level: string): AlertRow | null {
  const s = loadStore();
  const arr = s.alerts[service];
  if (!arr || arr.length === 0) return null;
  const matching = arr.filter((a: any) => a.level === level);
  if (matching.length === 0) return null;
  return matching[matching.length - 1];
}

export function closeDb(): void {
  saveStore();
  store = null;
}
