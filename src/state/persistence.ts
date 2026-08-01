import type { GameState } from '../types/game';
import { calculateDetailedOfflineProgress } from './offline';
import { isTestEnv } from './env';

const isUuid = (str: string) => {
  const simpleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return simpleUuidRegex.test(str);
};

export const getAccountsList = (): string[] => {
  const isTest = isTestEnv();
  const listJson = localStorage.getItem('aether_garden_accounts_list');
  if (listJson) {
    try {
      const parsed = JSON.parse(listJson);
      if (Array.isArray(parsed)) {
        if (isTest) return parsed;

        const list = parsed.filter((u: string) => u !== 'Guest');
        let hasMigrated = false;
        const newList: string[] = [];

        for (const item of list) {
          if (isUuid(item)) {
            newList.push(item);
          } else {
            // 就地将老旧角色代号迁移为规范的 UUID
            const oldKey = `aether_garden_save_${item}`;
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
              const newId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'char_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

              try {
                const saveObj = JSON.parse(oldData);
                saveObj.username = item; // 写入自描述
                localStorage.setItem(`aether_garden_save_${newId}`, JSON.stringify(saveObj));
                localStorage.removeItem(oldKey);
                newList.push(newId);
                hasMigrated = true;

                // 如果当前选中的也是这个老代号，更新它
                const curUser = localStorage.getItem('aether_garden_save_current_user');
                if (curUser === item) {
                  localStorage.setItem('aether_garden_save_current_user', newId);
                }
              } catch {}
            }
          }
        }

        if (hasMigrated) {
          localStorage.setItem('aether_garden_accounts_list', JSON.stringify(newList));
          return newList;
        }
        return list;
      }
    } catch (e) {
      console.error("Failed to parse accounts list", e);
    }
  }
  return isTest ? ['Guest'] : [];
};

export const getSaveKey = (username: string): string => `aether_garden_save_${username}`;

export const saveState = (username: string, state: GameState): void => {
  localStorage.setItem(getSaveKey(username), JSON.stringify(state));
};

// 新开局 / 无存档时的全新状态
export const createFreshState = (initialState: GameState, now: number): GameState => ({
  ...initialState,
  lastTick: now,
  dayStartTime: now
});

// 将旧存档与初始状态深度合并，保证新字段有默认值
export const mergeSavedState = (parsed: GameState, initialState: GameState): GameState => ({
  ...initialState,
  ...parsed,
  greenhouse: {
    ...initialState.greenhouse,
    ...(parsed.greenhouse || {})
  },
  shelter: {
    ...initialState.shelter,
    ...(parsed.shelter || {}),
    facilities: {
      ...initialState.shelter.facilities,
      ...((parsed.shelter && parsed.shelter.facilities) || {})
    }
  },
  exploration: {
    ...initialState.exploration,
    ...(parsed.exploration || {}),
    capsulesCharge: {
      ...initialState.exploration.capsulesCharge,
      ...((parsed.exploration && parsed.exploration.capsulesCharge) || {})
    },
    survivorResonance: {
      ...initialState.exploration.survivorResonance,
      ...((parsed.exploration && parsed.exploration.survivorResonance) || {})
    }
  },
  heroes: {
    ...initialState.heroes,
    ...(parsed.heroes || {})
  },
  soulShards: {
    ...(initialState.soulShards || {}),
    ...(parsed.soulShards || {})
  },
  summon: {
    ...(initialState.summon || { pityCount: 0 }),
    ...(parsed.summon || {})
  },
  combat: {
    ...initialState.combat,
    ...(parsed.combat || {}),
    // 区域链通关记录：旧存档缺失时回退空列表
    zonesCleared: (parsed.combat && parsed.combat.zonesCleared) || initialState.combat.zonesCleared
  }
});

// 加载存档（含离线结算）；无存档/损坏时返回全新状态
export const loadOrCreateState = (
  targetUser: string | null,
  initialState: GameState
): GameState => {
  const now = Date.now();

  if (!targetUser) {
    return createFreshState(initialState, now);
  }

  const saved = localStorage.getItem(getSaveKey(targetUser));
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as GameState;
      const elapsedSeconds = parsed.lastTick ? Math.max(0, Math.floor((now - parsed.lastTick) / 1000)) : 0;
      const mergedState = mergeSavedState(parsed, initialState);
      const { updatedState, report } = calculateDetailedOfflineProgress(mergedState, elapsedSeconds);
      return {
        ...updatedState,
        lastTick: now,
        dayStartTime: parsed.dayStartTime || now,
        lastOfflineReport: elapsedSeconds > 10 ? report : null
      };
    } catch (e) {
      console.error("Failed to load save", e);
    }
  }
  return createFreshState(initialState, now);
};

// 创建新角色存档（写入自描述 username）
export const createNewAccountState = (
  username: string,
  characterId: string,
  initialState: GameState
): GameState & { username: string } => {
  const now = Date.now();
  return {
    ...initialState,
    username,
    lastTick: now,
    dayStartTime: now,
    logs: [{ id: `init_${characterId}`, text: `▶ 生存者 ${username} 的避难所系统已初始化。`, timestamp: now, type: 'system' }]
  };
};
