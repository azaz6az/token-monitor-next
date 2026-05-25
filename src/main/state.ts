// 共享状态，避免 main.ts 和 manager.ts 之间的循环依赖
let isQuitting = false;

export function getIsQuitting(): boolean { return isQuitting; }
export function setIsQuitting(v: boolean): void { isQuitting = v; }
