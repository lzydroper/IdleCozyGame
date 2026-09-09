/**
 * 挂机信息流环形缓冲（combat-experience 01 / X1+X2 拍板）：
 * - 单一生产者：GameContext Tick 结算挂机后推入格式化事件行；
 * - 纯消费者：IdleCombatWidget 经 useSyncExternalStore 订阅渲染尾部；
 * - 独立内存载体：不入 GameState、不持久化（挂机 feed 是临时 UI 数据，刷新即失可接受）。
 */

export interface IdleFeedEntry {
  id: number;
  text: string;
  kind: 'battle' | 'victory' | 'defeat' | 'system';
}

const CAPACITY = 50;

let seq = 0;
let buffer: IdleFeedEntry[] = [];
let snapshot: IdleFeedEntry[] = [];
const listeners = new Set<() => void>();

const notify = (): void => {
  snapshot = [...buffer];
  listeners.forEach(listener => listener());
};

export const IDLE_FEED_CAPACITY = CAPACITY;

export const pushIdleFeed = (text: string, kind: IdleFeedEntry['kind'] = 'battle'): void => {
  buffer = [...buffer.slice(-(CAPACITY - 1)), { id: ++seq, text, kind }];
  notify();
};

export const pushIdleFeedLines = (lines: readonly string[], kind: IdleFeedEntry['kind'] = 'battle'): void => {
  if (lines.length === 0) return;
  const trimmed = buffer.slice(-(CAPACITY - lines.length));
  buffer = [...trimmed, ...lines.map(text => ({ id: ++seq, text, kind }))];
  notify();
};

export const getIdleFeedSnapshot = (): IdleFeedEntry[] => snapshot;

export const subscribeIdleFeed = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearIdleFeed = (): void => {
  buffer = [];
  snapshot = [];
  notify();
};

// === 战败/停止回顾（combat-experience 04 / O#5）===

export interface IdleStopRecord {
  reason: 'defeat' | 'stamina';
  regionId: string;
  levelId: string;
  totalBattles: number;
  totalVictories: number;
  totalDrops: Record<string, number>;
  totalSoulEchoes: number;
}

let lastStop: IdleStopRecord | null = null;

export const setLastIdleStop = (record: IdleStopRecord): void => {
  lastStop = record;
};

export const getLastIdleStop = (): IdleStopRecord | null => lastStop;

export const clearLastIdleStop = (): void => {
  lastStop = null;
};
