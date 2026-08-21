import type { GameState } from '../types/game';

export type LogType = 'event' | 'logistics' | 'combat' | 'dream' | 'system';

// 追加一条避难所日志（最多保留 100 条）
export const addLogUpdate = (state: GameState, text: string, type: LogType): GameState => {
  const newEntry = { id: `${Date.now()}_${Math.random()}`, text, timestamp: Date.now(), type };
  const updatedLogs = [newEntry, ...state.logs].slice(0, 100);
  return { ...state, logs: updatedLogs };
};
