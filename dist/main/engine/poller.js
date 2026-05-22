"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPolling = startPolling;
exports.stopPolling = stopPolling;
exports.triggerManualRefresh = triggerManualRefresh;
const clients_1 = require("../api/clients");
const database_1 = require("../db/database");
const rate_1 = require("./rate");
const alerts_1 = require("./alerts");
const POLL_INTERVAL = 30_000;
const RATE_RECORD_INTERVAL = 60_000;
let pollTimer = null;
const lastTokensUsed = { deepseek: 0, mimo: 0 };
const lastRateRecordTime = { deepseek: 0, mimo: 0 };
let onData = null;
function startPolling(callback) {
    onData = callback;
    if (pollTimer)
        return;
    poll();
    pollTimer = setInterval(poll, POLL_INTERVAL);
}
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}
async function poll() {
    const keys = (0, clients_1.getApiKeys)();
    const services = [
        { name: 'deepseek', key: keys.deepseek, fetcher: clients_1.fetchDeepSeekBalance },
        { name: 'mimo', key: keys.mimo, fetcher: clients_1.fetchMiMoBalance },
    ];
    for (const svc of services) {
        if (!svc.key)
            continue;
        try {
            const data = await svc.fetcher(svc.key);
            (0, database_1.insertBalance)(data.service, data.balance, data.tokensUsed);
            const now = Date.now();
            const prevTokens = lastTokensUsed[data.service] ?? data.tokensUsed;
            const timeSinceLast = now - (lastRateRecordTime[data.service] ?? now);
            if (timeSinceLast >= RATE_RECORD_INTERVAL && prevTokens > 0) {
                const tokensDelta = Math.max(0, data.tokensUsed - prevTokens);
                const minutesElapsed = timeSinceLast / 60_000;
                const rate = tokensDelta / minutesElapsed;
                (0, database_1.insertRate)(data.service, Math.round(rate));
                lastTokensUsed[data.service] = data.tokensUsed;
                lastRateRecordTime[data.service] = now;
            }
            else if (prevTokens === 0) {
                lastTokensUsed[data.service] = data.tokensUsed;
                lastRateRecordTime[data.service] = now;
            }
            const rateInfo = (0, rate_1.calculateRate)(data.service);
            const alert = (0, alerts_1.evaluateAlert)(data.service, rateInfo.estimatedMinutesLeft);
            onData?.(rateInfo, alert);
        }
        catch (err) {
            console.error(`Failed to poll ${svc.name}:`, err);
            const rateInfo = (0, rate_1.calculateRate)(svc.name);
            const alert = (0, alerts_1.evaluateAlert)(svc.name, rateInfo.estimatedMinutesLeft);
            onData?.(rateInfo, alert);
        }
    }
}
function triggerManualRefresh() {
    poll();
}
//# sourceMappingURL=poller.js.map