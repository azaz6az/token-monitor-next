"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRate = calculateRate;
const database_1 = require("../db/database");
const TOKENS_PER_YUAN = 100_000;
function calculateRate(service) {
    const latestBalance = (0, database_1.getLatestBalance)(service);
    const balance = latestBalance?.balance ?? 0;
    const tokensUsed = latestBalance?.tokens_used ?? 0;
    const records = (0, database_1.getRecentRates)(service, 5);
    const recentRates = records.map(r => r.tokens_per_minute);
    if (recentRates.length === 0) {
        return { service, currentRate: 0, recentRates: [], estimatedMinutesLeft: Infinity, balance, tokensUsed };
    }
    const currentRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    const estimatedTokensLeft = balance * TOKENS_PER_YUAN;
    const estimatedMinutesLeft = currentRate > 0 ? estimatedTokensLeft / currentRate : Infinity;
    return { service, currentRate, recentRates, estimatedMinutesLeft, balance, tokensUsed };
}
//# sourceMappingURL=rate.js.map