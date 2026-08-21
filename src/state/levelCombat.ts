import type { GameState, HeroState, CombatSettlement, CombatIdleState } from '../types/game';
import type { LevelConfig } from '../data/regions';
import { getMainlineRegions, getRegion, getLevel } from '../data/regionSelectors';
import { ENEMY_CONFIGS } from '../data/enemies';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { heroToCombatant, simulateBattle, enemyConfigToEntity } from './combat';
import { rollDropEntries } from './dropEngine';
export { rollDropEntries };
import { aggregateBonus } from './bonds';
import { addItemRewards } from './equipment';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

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

const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

const getParty = (state: GameState): string[] =>
  (state.party || []).filter((id) => isKnownHero(state, id));

const levelIdleOrDefault = (state: GameState): CombatIdleState => {
  const idle = state.combat?.idle;
  return {
    regionId: idle?.regionId ?? null,
    levelId: idle?.levelId ?? null,
    startTime: idle?.startTime ?? null,
    accumulatedSeconds: idle?.accumulatedSeconds ?? 0
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

export const isRegionUnlocked = (state: GameState, regionId: string): boolean => {
  const region = getRegion(regionId);
  if (!region) return false;
  if (region.isTestZone) return true;
  const mainline = getMainlineRegions();
  const idx = mainline.findIndex((r) => r.id === regionId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  return isRegionCleared(state, mainline[idx - 1].id);
};

export const isLevelUnlocked = (state: GameState, regionId: string, levelId: string): boolean => {
  const region = getRegion(regionId);
  if (!region) return false;
  const idx = region.levels.findIndex((level) => level.id === levelId);
  if (idx === -1) return false;
  if (idx === 0) return isRegionUnlocked(state, regionId);
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
  const nextStamina = state.stamina - level.staminaCost;
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
      if (hero) nextHeroes[id] = { ...hero, hp: hero.maxHp };
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
  if ((state.stamina || 0) < level.staminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map((id) => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToEntities(level.enemies),
    COMBAT_CONFIG.maxBattleRounds,
    rng
  );

  const settled = settleLevelBattle(state, battle, party, regionId, level, rng);
  const logText = battle.victory
    ? `战斗胜利！小队在【${region.name} · ${level.name}】击退敌人，获得 ${Object.entries(settled.settlement.drops).map(([id, q]) => `${id}×${q}`).join('、') || '少量材料'}。`
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
  if ((state.stamina || 0) < level.staminaCost) return { state, result: { ok: false, failure: 'no_stamina' } };

  return {
    state: {
      ...state,
      combat: {
        ...state.combat,
        idle: { regionId, levelId, startTime: now, accumulatedSeconds: 0 }
      }
    },
    result: { ok: true }
  };
};

export const stopLevelIdleUpdate = (state: GameState): UpdateResult<boolean> => {
  if (!state.combat?.idle?.regionId && !state.combat?.idle?.levelId) return NO_OP(state);
  return {
    state: {
      ...state,
      combat: {
        ...state.combat,
        idle: { regionId: null, levelId: null, startTime: null, accumulatedSeconds: 0 }
      }
    },
    result: true
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
          idle: { regionId: null, levelId: null, startTime: null, accumulatedSeconds: 0 }
        }
      },
      result: emptyLevelIdleOutcome()
    };
  }

  const totalSeconds = (idle.accumulatedSeconds || 0) + elapsedSeconds;
  const cappedSeconds = Math.min(totalSeconds, COMBAT_CONFIG.maxIdleSettlementSeconds);
  const staminaBattles = Math.floor((state.stamina || 0) / level.staminaCost);
  if (staminaBattles === 0) {
    if (!autoStopOnEmptyStamina) {
      return {
        state: {
          ...state,
          combat: { ...state.combat, idle: { ...idle, accumulatedSeconds: cappedSeconds } }
        },
        result: { ...emptyLevelIdleOutcome(), battlesFought: 0 }
      };
    }
    return {
      state: {
        ...state,
        combat: {
          ...state.combat,
          idle: { regionId: null, levelId: null, startTime: null, accumulatedSeconds: 0 }
        }
      },
      result: { ...emptyLevelIdleOutcome(), autoStopped: true, stopReason: 'stamina' as const }
    };
  }

  const battleCount = Math.min(
    Math.floor(cappedSeconds / COMBAT_CONFIG.battleDurationSeconds),
    staminaBattles
  );
  const leftoverSeconds = Math.min(
    totalSeconds - battleCount * COMBAT_CONFIG.battleDurationSeconds,
    COMBAT_CONFIG.maxIdleSettlementSeconds
  );

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

    if (settled.nextStamina < level.staminaCost && autoStopOnEmptyStamina) {
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
          ? { regionId: null, levelId: null, startTime: null, accumulatedSeconds: 0 }
          : { ...idle, accumulatedSeconds: leftoverSeconds }
      }
    },
    result: outcome
  };
};
