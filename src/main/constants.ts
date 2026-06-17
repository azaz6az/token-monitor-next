// 主进程共享常量

/** 每元等于多少 tokens（估算值） */
export const TOKENS_PER_YUAN = 100_000;

/** Token Plan 余额单位换算（每单位点数对应 tokens） */
export const TOKEN_PLAN_TOKENS_PER_UNIT = 1_000;

/** 轮询间隔 (ms) */
export const POLL_INTERVAL_MS = 60_000;

/** 速率记录间隔 (ms) */
export const RATE_RECORD_INTERVAL_MS = 60_000;

/** 告警冷却时间 (ms，持久化层） */
export const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

/** 气泡冷却时间 (ms，内存层） */
export const BUBBLE_COOLDOWN_MS = 5 * 60 * 1000;

/** 历史数据保留天数 */
export const DATA_RETENTION_DAYS = 30;
