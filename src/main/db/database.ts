import Database from 'better-sqlite3';
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

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'token-monitor.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initTables();
    cleanOldRecords();
  }
  return db;
}

function initTables(): void {
  try {
    const d = getDb();
    d.exec(`
      CREATE TABLE IF NOT EXISTS balance_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        balance REAL NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        recorded_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS rate_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        tokens_per_minute REAL NOT NULL,
        recorded_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT,
        triggered_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_balance_service_time
        ON balance_snapshots(service, recorded_at);
      CREATE INDEX IF NOT EXISTS idx_rate_service_time
        ON rate_records(service, recorded_at);
    `);
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
    throw err;
  }
}

function cleanOldRecords(): void {
  try {
    getDb().exec(`
      DELETE FROM balance_snapshots WHERE recorded_at < datetime('now', '-30 days');
      DELETE FROM rate_records WHERE recorded_at < datetime('now', '-30 days');
      DELETE FROM alert_logs WHERE triggered_at < datetime('now', '-30 days');
    `);
  } catch (err) {
    console.error('Failed to clean old records:', err);
  }
}

export function insertBalance(service: string, balance: number, tokensUsed: number): void {
  getDb().prepare(
    'INSERT INTO balance_snapshots (service, balance, tokens_used) VALUES (?, ?, ?)'
  ).run(service, balance, tokensUsed);
}

export function insertRate(service: string, tokensPerMinute: number): void {
  getDb().prepare(
    'INSERT INTO rate_records (service, tokens_per_minute) VALUES (?, ?)'
  ).run(service, tokensPerMinute);
}

export function insertAlert(service: string, level: string, message: string): void {
  getDb().prepare(
    'INSERT INTO alert_logs (service, level, message) VALUES (?, ?, ?)'
  ).run(service, level, message);
}

export function getLatestBalance(service: string): BalanceRow | null {
  const row = getDb().prepare<string[], BalanceRow>(
    'SELECT balance, tokens_used, recorded_at FROM balance_snapshots WHERE service = ? ORDER BY id DESC LIMIT 1'
  ).get(service);
  return row ?? null;
}

export function getRecentRates(service: string, limit: number = 5): RateRow[] {
  return getDb().prepare<(string | number)[], RateRow>(
    'SELECT tokens_per_minute, recorded_at FROM rate_records WHERE service = ? ORDER BY id DESC LIMIT ?'
  ).all(service, limit);
}

export function getLastAlert(service: string, level: string): AlertRow | null {
  const row = getDb().prepare<string[], AlertRow>(
    'SELECT triggered_at FROM alert_logs WHERE service = ? AND level = ? ORDER BY id DESC LIMIT 1'
  ).get(service, level);
  return row ?? null;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
