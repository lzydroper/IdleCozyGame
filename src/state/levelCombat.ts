import type { GameState, HeroState, CombatSettlement, CombatIdleState } from '../types/game';
import type { LevelConfig, RegionConfig } from '../data/regions';
import { getMainlineRegions, getRegion, getLevel, getTestRegions } from '../data/regionSelectors';
import { ITEMS_CONFIG } from '../data/items';
import { getRegionProgressPercent } from './explorationProgress';
import { ENEMY_CONFIGS } from '../data/enemies';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { heroToCombatant, simulateBattle, enemyConfigToEntity } from './combat';
import { rollDropEntries } from './dropEngine';
import { aggregateBonus } from './bonds';
import { addItemRewards } from './equipment';
import { getStamina, tryConsumeStamina } from './stamina';
import type { UpdateResult } from './types';

// === combat-level ticket 02：Region/Level 战斗状态与掉落结算内核（Expand） ===
// 旧 zone 路径保留可用；新路径按 regionId + levelId 工作。

export type LevelCombatFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_level' | 'locked';

export interface LevelCombatOutcome {
  settlement: CombatSettlement | null;
  failure?: LevelCombatFailure;
}

export type LevelIdleStartFailure = 'unknown_level' | 'locked' | 'no_party' | 'wounded' | 'no_stamina' | 'already_idling';

export interface LevelIdleStartOutcome {
  ok: boolean;
  failure?: LevelIdleStartFailure;
}

export interface LevelIdleSettlementOutcome {
  battlesFought: number;
  victories: number;
  defeats: number;
  draws: number;
  drops: Record<string, number>;
  soulEchoesGained: number;
  staminaConsumed: number;
  autoStopped: boolean;
  stopReason?: 'stamina' | 'defeat';
}

export interface UnlockDiagnosticItem {
  text: string;
  current: string;
  passed: boolean;
}

const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

const getParty = (state: GameState): string[] =>
  (state.party || []).filter((id) => isKnownHero(state, id));

export const EMPTY_IDLE_STATE: CombatIdleState = {
  regionId: null,
  levelId: null,
  startTime: null,
  accumulatedSeconds: 0,
  totalBattles: 0,
  totalVictories: 0,
  totalDefeats: 0,
  totalDraws: 0,
  totalDrops: {},
  totalSoulEchoes: 0
};

const levelIdleOrDefault = (state: GameState): CombatIdleState => {
  const idle = state.combat?.idle;
  return {
    regionId: idle?.regionId ?? EMPTY_IDLE_STATE.regionId,
    levelId: idle?.levelId ?? EMPTY_IDLE_STATE.levelId,
    startTime: idle?.startTime ?? EMPTY_IDLE_STATE.startTime,
    accumulatedSeconds: idle?.accumulatedSeconds ?? EMPTY_IDLE_STATE.accumulatedSeconds,
    totalBattles: idle?.totalBattles ?? EMPTY_IDLE_STATE.totalBattles,
    totalVictories: idle?.totalVictories ?? EMPTY_IDLE_STATE.totalVictories,
    totalDefeats: idle?.totalDefeats ?? EMPTY_IDLE_STATE.totalDefeats,
    totalDraws: idle?.totalDraws ?? EMPTY_IDLE_STATE.totalDraws,
    totalDrops: idle?.totalDrops ?? EMPTY_IDLE_STATE.totalDrops,
    totalSoulEchoes: idle?.totalSoulEchoes ?? EMPTY_IDLE_STATE.totalSoulEchoes
  };
};

export const getClearedLevels = (state: GameState): Record<string, string[]> =>
  state.combat?.clearedLevels ?? {};

export const isRegionCleared = (state: GameState, regionId: string): boolean => {
  const region = getRegion(regionId);
  if (!region || region.levels.length === 0) return false;
  const lastId = region.levels[region.levels.length - 1].id;
  return (getClearedLevels(state)[regionId] ?? []).includes(lastId);
};

export const getRegionUnlockDiagnostics = (
  state: GameState,
  regionId: string,
  mode: 'exploration' | 'combat' | 'expedition' = 'combat'
): UnlockDiagnosticItem[] => {
  const region = getRegion(regionId);
  if (!region || region.isTestZone) return [];

  if (region.unlock && region.unlock.length > 0) {
    return region.unlock.map((req) => {
      if (req.type === 'regionExplored') {
        const target = getRegion(req.regionId);
        const currentPct = getRegionProgressPercent(state, req.regionId);
        const passed = currentPct >= req.percent;
        return {
          text: `区域【${target?.name || req.regionId}】探索度需达 ${req.percent}%`,
          current: `当前 ${currentPct}%`,
          passed
        };
      }
      if (req.type === 'levelCleared') {
        const target = getRegion(req.regionId);
        const targetLevel = getLevel(req.regionId, req.levelId);
        const cleared = (getClearedLevels(state)[req.regionId] ?? []).includes(req.levelId);
        return {
          text: `通关关卡【${target?.name || req.regionId} · ${targetLevel?.name || req.levelId}】`,
          current: cleared ? '已通关' : '未通关',
          passed: cleared
        };
      }
      if (req.type === 'itemHeld') {
        const itemCfg = ITEMS_CONFIG[req.itemId];
        const count = state.inventory[req.itemId] || 0;
        const passed = count >= req.count;
        return {
          text: `持有关键物资【${itemCfg?.name || req.itemId} ×${req.count}】`,
          current: `持有 ${count}/${req.count}`,
          passed
        };
      }
      return { text: '未知解锁条件', current: '未达成', passed: false };
    });
  }

  // 战斗与远征模式：要求该区域探索度达到 100%
  if (mode === 'combat' || mode === 'expedition') {
    const currentPct = getRegionProgressPercent(state, regionId);
    const passed = currentPct >= 100;
    return [
      {
        text: `区域【${region.name}】探索度需达 100%`,
        current: `当前 ${currentPct}%`,
        passed
      }
    ];
  }

  // 荒野探索模式：线性推进，首区默认解锁，后续区域需要前置区域探索度达到 100%
  const mainline = getMainlineRegions();
  const idx = mainline.findIndex((r) => r.id === regionId);
  if (idx <= 0) return [];

  const prevRegion = mainline[idx - 1];
  const prevPct = getRegionProgressPercent(state, prevRegion.id);
  const passed = prevPct >= 100;
  return [
    {
      text: `前置区域【${prevRegion.name}】探索度需达 100%`,
      current: `当前 ${prevPct}%`,
      passed
    }
  ];
};

export const isRegionUnlocked = (
  state: GameState,
  regionId: string,
  mode: 'exploration' | 'combat' | 'expedition' = 'combat'
): boolean => {
  const region = getRegion(regionId);
  if (!region) return false;
  if (region.isTestZone) return true;

  if (mode === 'combat' || mode === 'expedition') {
    if (region.unlock && region.unlock.length > 0) {
      const diags = getRegionUnlockDiagnostics(state, regionId, mode);
      return diags.every((d) => d.passed);
    }
    return getRegionProgressPercent(state, regionId) >= 100;
  }

  // mode === 'exploration'
  if (region.unlock && region.unlock.length > 0) {
    const diags = getRegionUnlockDiagnostics(state, regionId, mode);
    return diags.every((d) => d.passed);
  }
  const mainline = getMainlineRegions();
  const idx = mainline.findIndex((r) => r.id === regionId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  const prevRegion = mainline[idx - 1];
  return getRegionProgressPercent(state, prevRegion.id) >= 100;
};

export const getVisibleRegionsForSelector = (
  state: GameState,
  mode: 'exploration' | 'combat' | 'expedition' = 'combat'
): RegionConfig[] => {
  const mainline = getMainlineRegions();
  const testRegions = getTestRegions();
  const visible: RegionConfig[] = [];
  let foundFirstLocked = false;

  for (const region of mainline) {
    const unlocked = isRegionUnlocked(state, region.id, mode);
    if (unlocked) {
      visible.push(region);
    } else if (!foundFirstLocked) {
      visible.push(region);
      foundFirstLocked = true;
    }
  }

  for (const testRegion of testRegions) {
    if (isRegionUnlocked(state, testRegion.id, mode)) {
      visible.push(testRegion);
    }
  }

  return visible;
};

export const isLevelUnlocked = (state: GameState, regionId: string, levelId: string): boolean => {
  const region = getRegion(regionId);
  if (!region) return false;
  const idx = region.levels.findIndex((level) => level.id === levelId);
  if (idx === -1) return false;
  if (idx === 0) return isRegionUnlocked(state, regionId, 'combat');
  const prevId = region.levels[idx - 1].id;
  return (getClearedLevels(state)[regionId] ?? []).includes(prevId);
};

const enemiesToEntities = (enemyIds: string[]) =>
  enemyIds.map((id) => {
    const enemy = ENEMY_CONFIGS[id];
    if (!enemy) throw new Error(`Unknown enemy id: ${id}`);
    return enemyConfigToEntity(enemy);
  });


interface LevelSettlement {
  nextStamina: number;
  nextInventory: Record<string, number>;
  nextEquipmentInventory: Record<string, unknown>;
  nextHeroes: Record<string, HeroState>;
  nextClearedLevels: Record<string, string[]>;
  settlement: CombatSettlement;
}

const mergeDrops = (target: Record<string, number>, extra: Record<string, number>): Record<string, number> => {
  const next = { ...target };
  for (const [itemId, count] of Object.entries(extra)) {
    next[itemId] = (next[itemId] || 0) + count;
  }
  return next;
};

export const settleLevelBattle = (
  state: GameState,
  battle: ReturnType<typeof simulateBattle>,
  party: string[],
  regionId: string,
  level: LevelConfig,
  rng: () => number
): LevelSettlement => {
  const nextStamina = tryConsumeStamina(state, level.staminaCost).state.stamina ?? 0;
  let nextInventory = { ...state.inventory };
  let nextEquipmentInventory: Record<string, unknown> = { ...state.equipmentInventory };
  const nextHeroes = { ...state.heroes };
  const woundedHeroIds: string[] = [];
  let drops: Record<string, number> = {};
  const clearedBefore = getClearedLevels(state)[regionId] ?? [];

  if (battle.victory) {
    drops = rollDropEntries(level.drops, rng);
    if (!clearedBefore.includes(level.id) && level.firstClearDrops) {
      drops = mergeDrops(drops, rollDropEntries(level.firstClearDrops, rng));
    }
    const reward = addItemRewards(nextInventory, nextEquipmentInventory as Record<string, { itemId: string; enhance: number; mythic: boolean }[]>, drops);
    nextInventory = reward.inventory;
    nextEquipmentInventory = reward.equipmentInventory;
    party.forEach((id) => {
      const hero = nextHeroes[id];
      if (hero) {
        const finalHp = battle.finalHp?.[id] ?? hero.hp;
        if (finalHp <= 0) {
          nextHeroes[id] = { ...hero, hp: 0, wounded: true };
          woundedHeroIds.push(id);
        } else {
          nextHeroes[id] = { ...hero, hp: finalHp };
        }
      }
    });
  } else if (battle.partyWiped) {
    party.forEach((id) => {
      nextHeroes[id] = { ...nextHeroes[id], hp: 0, wounded: true };
      woundedHeroIds.push(id);
    });
  }

  const soulEchoes = drops.soul_echo ?? 0;
  const nextClearedLevels = { ...getClearedLevels(state) };
  if (battle.victory && !clearedBefore.includes(level.id)) {
    nextClearedLevels[regionId] = [...(nextClearedLevels[regionId] ?? []), level.id];
  }

  const settlement: CombatSettlement = {
    battle,
    drops,
    soulEchoes,
    expPerHero: 0,
    woundedHeroIds
  };

  return {
    nextStamina,
    nextInventory,
    nextEquipmentInventory,
    nextHeroes,
    nextClearedLevels,
    settlement
  };
};

const makeLevelLog = (text: string) => ({
  id: `${Date.now()}_${Math.random()}`,
  text,
  timestamp: Date.now(),
  type: 'combat' as const
});

export const startLevelCombatUpdate = (
  state: GameState,
  regionId: string,
  levelId: string,
  rng: () => number = Math.random
): UpdateResult<LevelCombatOutcome> => {
  const region = getRegion(regionId);
  const level = getLevel(regionId, levelId);
  if (!region || !level) return { state, result: { settlement: null, failure: 'unknown_level' } };
  if (!isLevelUnlocked(state, regionId, levelId)) return { state, result: { settlement: null, failure: 'locked' } };

  const party = getParty(state);
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some((id) => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if (getStamina(state) < level.staminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map((id) => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToEntities(level.enemies),
    COMBAT_CONFIG.maxBattleRounds,
    rng
  );

  const settled = settleLevelBattle(state, battle, party, regionId, level, rng);
  const dropText =
    Object.entries(settled.settlement.drops)
      .map(([id, q]) => `${ITEMS_CONFIG[id]?.name || id} ×${q}`)
      .join('、') || '少量材料';
  const logText = battle.victory
    ? `战斗胜利！小队在【${region.name} · ${level.name}】击退敌人，获得 ${dropText}。`
    : battle.partyWiped
      ? `战斗失败！小队在【${region.name} · ${level.name}】全员倒下，进入重伤状态。`
      : `战斗平局！小队在【${region.name} · ${level.name}】鏖战至回合上限未分胜负。`;

  return {
    state: {
      ...state,
      stamina: settled.nextStamina,
      inventory: settled.nextInventory,
      equipmentInventory: settled.nextEquipmentInventory as GameState['equipmentInventory'],
      heroes: settled.nextHeroes,
      combat: {
        ...state.combat,
        regionId,
        levelId,
        clearedLevels: settled.nextClearedLevels,
        lastSettlement: settled.settlement,
        idle: levelIdleOrDefault(state)
      },
      logs: [makeLevelLog(logText), ...state.logs].slice(0, 100)
    },
    result: { settlement: settled.settlement }
  };
};

export const startLevelIdleUpdate = (
  state: GameState,
  regionId: string,
  levelId: string,
  now: number = Date.now()
): UpdateResult<LevelIdleStartOutcome> => {
  if (state.combat?.idle?.regionId || state.combat?.idle?.levelId) {
    return { state, result: { ok: false, failure: 'already_idling' } };
  }
  const region = getRegion(regionId);
  const level = getLevel(regionId, levelId);
  if (!region || !level) return { state, result: { ok: false, failure: 'unknown_level' } };

  const cleared = getClearedLevels(state)[regionId] ?? [];
  if (!cleared.includes(levelId)) return { state, result: { ok: false, failure: 'locked' } };

  const party = getParty(state);
  if (party.length === 0) return { state, result: { ok: false, failure: 'no_party' } };
  if (party.some((id) => state.heroes[id].wounded)) return { state, result: { ok: false, failure: 'wounded' } };
  if (getStamina(state) < level.staminaCost) return { state, result: { ok: false, failure: 'no_stamina' } };

  return {
    state: {
      ...state,
      combat: {
        ...state.combat,
        idle: {
          regionId,
          levelId,
          startTime: now,
          accumulatedSeconds: 0,
          totalBattles: 0,
          totalVictories: 0,
          totalDefeats: 0,
          totalDraws: 0,
          totalDrops: {},
          totalSoulEchoes: 0
        }
      }
    },
    result: { ok: true }
  };
};

export interface IdleSummaryData {
  regionId: string | null;
  levelId: string | null;
  startTime: number | null;
  durationSeconds: number;
  totalBattles: number;
  totalVictories: number;
  totalDefeats: number;
  totalDraws: number;
  totalDrops: Record<string, number>;
  totalSoulEchoes: number;
}

export interface StopLevelIdleOutcome {
  ok: boolean;
  summary: IdleSummaryData | null;
}

export const stopLevelIdleUpdate = (
  state: GameState,
  now: number = Date.now()
): UpdateResult<StopLevelIdleOutcome> => {
  const idle = state.combat?.idle;
  if (!idle?.regionId && !idle?.levelId) {
    return { state, result: { ok: false, summary: null } };
  }
  const startTime = idle.startTime || now;
  const durationSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
  const summary: IdleSummaryData = {
    regionId: idle.regionId,
    levelId: idle.levelId,
    startTime: idle.startTime,
    durationSeconds,
    totalBattles: idle.totalBattles || 0,
    totalVictories: idle.totalVictories || 0,
    totalDefeats: idle.totalDefeats || 0,
    totalDraws: idle.totalDraws || 0,
    totalDrops: { ...(idle.totalDrops || {}) },
    totalSoulEchoes: idle.totalSoulEchoes || 0
  };

  return {
    state: {
      ...state,
      combat: {
        ...state.combat,
        idle: EMPTY_IDLE_STATE
      }
    },
    result: { ok: true, summary }
  };
};

const emptyLevelIdleOutcome = (): LevelIdleSettlementOutcome => ({
  battlesFought: 0,
  victories: 0,
  defeats: 0,
  draws: 0,
  drops: {},
  soulEchoesGained: 0,
  staminaConsumed: 0,
  autoStopped: false
});

export const settleLevelIdleUpdate = (
  state: GameState,
  elapsedSeconds: number,
  rng: () => number = Math.random,
  autoStopOnEmptyStamina: boolean = true
): UpdateResult<LevelIdleSettlementOutcome> => {
  const idle = state.combat?.idle;
  const regionId = idle?.regionId ?? null;
  const levelId = idle?.levelId ?? null;
  if (!regionId || !levelId || elapsedSeconds <= 0) {
    return { state, result: emptyLevelIdleOutcome() };
  }

  const level = getLevel(regionId, levelId);
  const party = getParty(state);
  if (!level || party.length === 0 || party.some((id) => state.heroes[id].wounded)) {
    return {
      state: {
        ...state,
        combat: {
          ...state.combat,
          idle: EMPTY_IDLE_STATE
        }
      },
      result: emptyLevelIdleOutcome()
    };
  }

  const totalSeconds = (idle.accumulatedSeconds || 0) + elapsedSeconds;
  const staminaBattles = Math.floor(getStamina(state) / level.staminaCost);
  if (staminaBattles === 0) {
    if (!autoStopOnEmptyStamina) {
      return {
        state: {
          ...state,
          combat: { ...state.combat, idle: { ...idle, accumulatedSeconds: totalSeconds } }
        },
        result: { ...emptyLevelIdleOutcome(), battlesFought: 0 }
      };
    }
    return {
      state: {
        ...state,
        combat: {
          ...state.combat,
          idle: EMPTY_IDLE_STATE
        }
      },
      result: { ...emptyLevelIdleOutcome(), autoStopped: true, stopReason: 'stamina' as const }
    };
  }

  const battleCount = Math.min(
    Math.floor(totalSeconds / COMBAT_CONFIG.battleDurationSeconds),
    staminaBattles
  );
  const leftoverSeconds = totalSeconds - battleCount * COMBAT_CONFIG.battleDurationSeconds;

  const outcome = emptyLevelIdleOutcome();
  let next = state;
  let lastSettlement: CombatSettlement | null = null;

  for (let i = 0; i < battleCount; i++) {
    const battle = simulateBattle(
      party.map((id) => heroToCombatant(id, next.heroes[id], aggregateBonus(party), next.equipment?.[id] || null)),
      enemiesToEntities(level.enemies),
      COMBAT_CONFIG.maxBattleRounds,
      rng
    );
    const settled = settleLevelBattle(next, battle, party, regionId, level, rng);
    next = {
      ...next,
      stamina: settled.nextStamina,
      inventory: settled.nextInventory,
      equipmentInventory: settled.nextEquipmentInventory as GameState['equipmentInventory'],
      heroes: settled.nextHeroes,
      combat: {
        ...next.combat,
        clearedLevels: settled.nextClearedLevels
      }
    };
    lastSettlement = settled.settlement;
    outcome.battlesFought++;
    outcome.staminaConsumed += level.staminaCost;

    if (battle.victory) {
      outcome.victories++;
      Object.entries(settled.settlement.drops).forEach(([itemId, qty]) => {
        outcome.drops[itemId] = (outcome.drops[itemId] || 0) + qty;
      });
      outcome.soulEchoesGained += settled.settlement.soulEchoes;
    } else if (battle.partyWiped) {
      outcome.defeats++;
      outcome.autoStopped = true;
      outcome.stopReason = 'defeat';
      break;
    } else {
      outcome.draws++;
    }

    if (Math.floor(settled.nextStamina) < level.staminaCost && autoStopOnEmptyStamina) {
      outcome.autoStopped = true;
      outcome.stopReason = 'stamina';
      break;
    }
  }

  const idleStopped = outcome.autoStopped;
  return {
    state: {
      ...next,
      combat: {
        ...next.combat,
        lastSettlement: lastSettlement ?? next.combat.lastSettlement,
        idle: idleStopped
          ? EMPTY_IDLE_STATE
          : {
              ...idle,
              accumulatedSeconds: leftoverSeconds,
              totalBattles: (idle.totalBattles || 0) + outcome.battlesFought,
              totalVictories: (idle.totalVictories || 0) + outcome.victories,
              totalDefeats: (idle.totalDefeats || 0) + outcome.defeats,
              totalDraws: (idle.totalDraws || 0) + outcome.draws,
              totalDrops: mergeDrops(idle.totalDrops || {}, outcome.drops),
              totalSoulEchoes: (idle.totalSoulEchoes || 0) + outcome.soulEchoesGained
            }
      }
    },
    result: outcome
  };
};
