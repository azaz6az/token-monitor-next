"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAlert = evaluateAlert;
const database_1 = require("../db/database");
const THRESHOLDS = [
    { level: 'critical', minutes: 15, autoClose: false, duration: 0, systemNotify: true },
    { level: 'warning', minutes: 60, autoClose: false, duration: 0, systemNotify: false },
    { level: 'reminder', minutes: 120, autoClose: true, duration: 5000, systemNotify: false },
];
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
function evaluateAlert(service, estimatedMinutesLeft) {
    if (!isFinite(estimatedMinutesLeft)) {
        return { level: 'normal', message: '', autoClose: true, duration: 0, systemNotify: false };
    }
    for (const t of THRESHOLDS) {
        if (estimatedMinutesLeft <= t.minutes) {
            const last = (0, database_1.getLastAlert)(service, t.level);
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
            (0, database_1.insertAlert)(service, t.level, buildMessage(service, estimatedMinutesLeft));
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
function buildMessage(service, minutesLeft) {
    const name = service === 'deepseek' ? 'DeepSeek' : 'MiMo';
    if (minutesLeft <= 15) {
        return `${name} 余额严重不足，预计 ${Math.round(minutesLeft)} 分钟后耗尽！`;
    }
    if (minutesLeft <= 60) {
        return `${name} 余额偏低，预计 ${Math.round(minutesLeft)} 分钟后耗尽`;
    }
    return `${name} 余额即将不足，预计约 ${Math.round(minutesLeft / 60)} 小时后耗尽`;
}
//# sourceMappingURL=alerts.js.map