import { getLastAlert, insertAlert } from '../db/database';
import { ALERT_COOLDOWN_MS } from '../constants';

export type AlertLevel = 'normal' | 'reminder' | 'warning' | 'critical';

export interface AlertState {
  level: AlertLevel;
  message: string;
  autoClose: boolean;
  duration: number;
  systemNotify: boolean;
}

interface Threshold {
  level: AlertLevel;
  minutes: number;
  autoClose: boolean;
  duration: number;
  systemNotify: boolean;
}

const THRESHOLDS: Threshold[] = [
  { level: 'critical', minutes: 15, autoClose: true, duration: 5000, systemNotify: true },
  { level: 'warning', minutes: 60, autoClose: true, duration: 5000, systemNotify: false },
  { level: 'reminder', minutes: 120, autoClose: true, duration: 5000, systemNotify: false },
];


export function evaluateAlert(service: string, estimatedMinutesLeft: number): AlertState {
  if (!isFinite(estimatedMinutesLeft)) {
    return { level: 'normal', message: '', autoClose: true, duration: 0, systemNotify: false };
  }

  for (const t of THRESHOLDS) {
    if (estimatedMinutesLeft <= t.minutes) {
      const last = getLastAlert(service, t.level);
      if (last) {
        const elapsed = Date.now() - new Date(last.triggered_at + 'Z').getTime();
        if (elapsed < ALERT_COOLDOWN_MS) {
          return {
            level: t.level,
            message: buildMessage(service, estimatedMinutesLeft),
            autoClose: t.autoClose,
            duration: t.duration,
            systemNotify: false,
          };
        }
      }
      insertAlert(service, t.level, buildMessage(service, estimatedMinutesLeft));
      return {
        level: t.level,
        message: buildMessage(service, estimatedMinutesLeft),
        autoClose: t.autoClose,
        duration: t.duration,
        systemNotify: t.systemNotify,
      };
    }
  }
  return { level: 'normal', message: '', autoClose: true, duration: 0, systemNotify: false };
}

function buildMessage(service: string, minutesLeft: number): string {
  const name = service === 'deepseek' ? 'DeepSeek' : service === 'token-plan' ? 'Token Plan' : 'MiMo';
  if (minutesLeft <= 15) {
    return `${name} 余额严重不足，预计 ${Math.round(minutesLeft)} 分钟后耗尽！`;
  }
  if (minutesLeft <= 60) {
    return `${name} 余额偏低，预计 ${Math.round(minutesLeft)} 分钟后耗尽`;
  }
  return `${name} 余额即将不足，预计约 ${Math.round(minutesLeft / 60)} 小时后耗尽`;
}
