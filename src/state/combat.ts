import type { GameState, HeroState, HeroEquipment, EquippedItem, LogEntry, BattleResult, CombatSettlement } from '../types/game';
import type { HeroConfig } from '../data/heroes';
import { HEROES_CONFIG } from '../data/heroes';
import type { DropEntry } from '../data/regions';
import { rollDropEntries } from './dropEngine';
import { advanceRegionProgress } from './explorationProgress';
import { ENEMY_CONFIGS } from '../data/enemies';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { REALITY_EVENTS } from '../data/realityEvents';
import { getHeroEquipmentBonus, addItemRewards } from './equipment';
import { aggregateBonus } from './bonds';
import type { StatModifier, BaseAttributes, PrimaryAttributes, SpecialAttributes } from './statSystem';
import { DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';
import { ITEMS_CONFIG } from '../data/items';
import { heroBaseAttributes, getMilestoneModifiers } from '../data/heroGrowth';
import { getTalentBonus } from './talents';
import { getAwakenBonus, getAwakenAbilityId } from './awakening';
import type { UpdateResult } from './types';
import { NO_OP } from './types';
import { runTurnEngine } from './turnEngine';
import type { BattleUnitSnapshot } from './turnEngine';
import { getAbilityConfig } from '../data/abilities';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { applyPassiveAbilities, collectPassiveBuffConfigs } from './abilityPassive';
import { createAbilityRuntime } from './abilityRuntime';
import { getStamina, tryConsumeStamina } from './stamina';
import { createBattleContext, type BattleContext } from './battleContext';
import { canActWithBuffs, createBuffTriggerHooks } from './buffRuntime';
import { BUFF_CONFIGS } from './buffTypes';
import { buildEntity, toTurnUnit, type BattleEntity, type EntityRecipe } from './battleEntity';
import { enemyConfigToEntity } from './entityFactory';

export { enemyConfigToEntity };

// === 战斗核心（ticket 05）：三人轮询回合制自动战斗 ===

// 英雄属性成长：随等级线性提升（装备/天赋见 ticket 10/11）
// 等级成长（16 号，08 决策 D1）：读职阶基础成长系数 + 英雄级里程碑加成；
// 唯一真相源 = data/heroGrowth.heroBaseAttributes（返回完整六项 BaseAttributes，详情面板共用）

// 经验入账：累计经验并升级（升到下一级所需经验 = 当前等级 * expPerLevel）；
// 每次升级获得 1 天赋点（ticket 11：天赋点仅来自战斗经验）
export const applyHeroExp = (hero: HeroState, config: HeroConfig, exp: number): HeroState => {
  let level = hero.level;
  let curExp = hero.exp + exp;
  while (curExp >= level * COMBAT_CONFIG.expPerLevel) {
    curExp -= level * COMBAT_CONFIG.expPerLevel;
    level += 1;
  }
  const maxHp = heroBaseAttributes(config, level).maxHp;
  const levelGained = level - hero.level;
  // 升级带来的生命上限成长同步补回当前血量
  return {
    ...hero,
    level,
    exp: curExp,
    maxHp,
    hp: hero.hp + (maxHp - hero.maxHp),
    talentPoints: (hero.talentPoints || 0) + levelGained
  };
};

// 英雄能力装配：普通攻击 + 觉醒技能（若觉醒）。返回解析后的 ResolvedAbility[]。
export const collectHeroAbilities = (heroId: string, hero: HeroState): ResolvedAbility[] => {
  const abilities: ResolvedAbility[] = [resolveAbilityConfig(getAbilityConfig('basic_attack')!)];
  const awakenAbilityId = getAwakenAbilityId(heroId, hero);
  if (awakenAbilityId) {
    const config = getAbilityConfig(awakenAbilityId);
    if (config) abilities.push(resolveAbilityConfig(config));
  }
  return abilities;
};

// 英雄 → BattleEntity：天赋/羁绊/装备/里程碑在转换时结算为 abilities + permanentModifiers + 三层属性。
export const heroToCombatant = (
  heroId: string,
  hero: HeroState,
  bonus: StatModifier[] = [],
  gear: HeroEquipment | null = null
): BattleEntity => {
  const config = HEROES_CONFIG[heroId];
  const baseAttributes: BaseAttributes = heroBaseAttributes(config, hero.level);
  const primaryAttributes: PrimaryAttributes = { ...config.primaryAttributes };
  const specialAttributes: SpecialAttributes = {
    ...DEFAULT_SPECIAL_ATTRIBUTES,
    ...config.specialAttributes
  };
  const permanentModifiers: StatModifier[] = [
    ...bonus,
    ...getMilestoneModifiers(config, hero.level),
    ...(gear ? getHeroEquipmentBonus(gear, config.faction) : []),
    ...getTalentBonus(heroId, hero),
    ...getAwakenBonus(heroId, hero)
  ];
  const recipe: EntityRecipe = { baseAttributes, primaryAttributes, specialAttributes, permanentModifiers };
  return buildEntity({
    id: heroId,
    name: config.name,
    kind: 'hero',
    side: 'hero',
    faction: config.faction,
    recipe,
    hpRatio: hero.maxHp > 0 ? hero.hp / hero.maxHp : 1,
    abilities: collectHeroAbilities(heroId, hero)
  });
};

// 敌人 id → BattleEntity。
const enemiesToEntities = (enemyIds: string[]): BattleEntity[] =>
  enemyIds.map(id => {
    const en = ENEMY_CONFIGS[id];
    if (!en) throw new Error(`Unknown enemy id: ${id}`);
    return enemyConfigToEntity(en);
  });

// 「无法行动」汇总已收口到 Buff 模块（combat-aftermath 02 D3 / Turn #14）；此处仅转发兼容旧导入。
export { canActWithBuffs };

export interface CreateBattleOptions {
  maxRounds?: number;
  rng?: () => number;
}

/**
 * 战斗装配工厂：BattleEntity[] → { run, context }。
 * 建单位、注册 Ability/Buff/被动、跑引擎全部收敛到这里；simulateBattle 只做薄壳。
 */
export const createBattle = (
  entities: BattleEntity[],
  options: CreateBattleOptions = {}
): { run: () => BattleResult; context: BattleContext } => {
  const units: BattleUnitSnapshot[] = entities.map(toTurnUnit);
  const passiveConfigs = collectPassiveBuffConfigs(units.flatMap(unit => unit.abilities));
  // context 契约（combat-hygiene 05 / En#7）：run 前访问抛明确错误，而非暴露未初始化值。
  let battleStore: BattleContext | undefined;
  const getBattle = (): BattleContext => {
    if (!battleStore) {
      throw new Error('createBattle: context 在 run() 之前不可用——请先调用 run()');
    }
    return battleStore;
  };
  const abilityRuntime = createAbilityRuntime(getBattle);
  const maxRounds = options.maxRounds ?? COMBAT_CONFIG.maxBattleRounds;
  const rng = options.rng ?? Math.random;

  const run = (): BattleResult => {
    const result = runTurnEngine(units, {
      maxRounds,
      rng,
      setup(runtime) {
        battleStore = createBattleContext(
          runtime,
          { ...BUFF_CONFIGS, ...passiveConfigs },
          createBuffTriggerHooks(getBattle)
        );
        applyPassiveAbilities(battleStore, runtime.getLivingUnits());
        abilityRuntime.setup(runtime);
      },
      canAct: (unit) => canActWithBuffs(getBattle(), unit.id),
      performAction: abilityRuntime.performAction
    });
    return {
      outcome: result.outcome,
      victory: result.outcome === 'victory',
      partyWiped: result.outcome === 'defeat',
      rounds: result.rounds,
      events: result.events,
      finalHp: result.finalHp
    };
  };

  return {
    run,
    get context(): BattleContext {
      return getBattle();
    }
  };
};

export const simulateBattle = (
  heroes: BattleEntity[],
  enemies: BattleEntity[],
  maxRounds: number = COMBAT_CONFIG.maxBattleRounds,
  rng: () => number = Math.random
): BattleResult => createBattle([...heroes, ...enemies], { maxRounds, rng }).run();
// 英雄是否可参战：状态存在且配置表存在（防御旧存档/损坏数据）
const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

// 战斗状态构造时保留挂机开关（防御旧存档/损坏数据缺 idle 字段）
const idleOrDefault = (state: GameState) =>
  state.combat?.idle || { regionId: null, levelId: null, startTime: null, accumulatedSeconds: 0 };

// 战斗日志条目构造（自动战斗/探索遭遇共用）
const makeCombatLog = (text: string): LogEntry => ({
  id: `${Date.now()}_${Math.random()}`,
  text,
  timestamp: Date.now(),
  type: 'combat'
});

// === 战斗结算核心（自动战斗/探索遭遇/BOSS 战共用，消除三处重复） ===
// 胜利 → 掉落掷骰（入库存或探索临时背囊）+ 灵魂残响 + 经验 + 战后修整满血；
// 战败（小队全灭）→ 全员重伤；平局 → 无奖励无重伤。体力照常消耗。
interface BattleSettleConfig {
  staminaCost: number;
  drops: DropEntry[];
  soulEchoMin: number;
  soulEchoMax: number;
  expReward: number;
  lootTo: 'inventory' | 'bag';  // 自动战斗/BOSS 入库存；探索遭遇入临时背囊
}

interface BattleSettlement {
  nextStamina: number;
  nextInventory: Record<string, number>;
  nextEquipmentInventory: Record<string, EquippedItem[]>;
  nextBag: Record<string, number>;
  nextHeroes: Record<string, HeroState>;
  soulEchoesGained: number;
  drops: Record<string, number>;
  woundedHeroIds: string[];
}

const settleBattle = (
  state: GameState,
  battle: BattleResult,
  party: string[],
  cfg: BattleSettleConfig,
  rng: () => number
): BattleSettlement => {
  const nextStamina = tryConsumeStamina(state, cfg.staminaCost).state.stamina;
  let nextInventory = { ...state.inventory };
  const nextEquipmentInventory = { ...state.equipmentInventory };
  const nextBag = { ...(state.exploration.realityBag || {}) };
  const nextHeroes = { ...state.heroes };
  const drops: Record<string, number> = {};
  const woundedHeroIds: string[] = [];
  let soulEchoesGained = 0;

  if (battle.victory) {
    // 胜利掉落：逐条掷骰（概率 + 数量）
    Object.entries(rollDropEntries(cfg.drops, rng)).forEach(([itemId, qty]) => {
      drops[itemId] = (drops[itemId] || 0) + qty;
      if (cfg.lootTo === 'bag') {
        // 探索遭遇：bag 保持计数（装备 +0），折返合并时实例化
        nextBag[itemId] = (nextBag[itemId] || 0) + qty;
      } else {
        // 直入背包：可穿戴装备实例化（ADR-0014 修订）
        const r = addItemRewards(nextInventory, nextEquipmentInventory, { [itemId]: qty });
        nextInventory = r.inventory;
        Object.assign(nextEquipmentInventory, r.equipmentInventory);
      }
    });
    // 灵魂残响掉落（落账进背包，结算报告保留 soulEchoesGained）
    if (cfg.soulEchoMax > cfg.soulEchoMin) {
      const seRoll = cfg.soulEchoMin + Math.floor(rng() * (cfg.soulEchoMax - cfg.soulEchoMin + 1));
      soulEchoesGained = seRoll;
      nextInventory.soul_echo = (nextInventory.soul_echo || 0) + seRoll;
    }
    // 经验入账 + 战后修整恢复满血（设计决策：战斗为独立"场景"，失败才承担重伤代价）
    party.forEach(id => {
      const leveled = applyHeroExp(nextHeroes[id], HEROES_CONFIG[id], cfg.expReward);
      nextHeroes[id] = { ...leveled, hp: leveled.maxHp };
    });
  } else if (battle.partyWiped) {
    // 战败（小队全灭）→ 全员重伤（hp 清零，禁止上阵）
    party.forEach(id => {
      nextHeroes[id] = { ...nextHeroes[id], hp: 0, wounded: true };
      woundedHeroIds.push(id);
    });
  }
  // 平局（回合上限双方均未全灭）：无掉落、无经验、无重伤，仅消耗体力

  return { nextStamina, nextInventory, nextEquipmentInventory, nextBag, nextHeroes, soulEchoesGained, drops, woundedHeroIds };
};

/**
 * 开始战斗：校验体力/队伍/重伤后整场模拟并一次性入账。
 * 胜利 → 掉落材料 + 灵魂残响 + 经验入账，小队战后修整恢复满血；
 * 战败 → 小队全员进入重伤（禁止上阵），无掉落无经验。
 * 战斗结果（结算 + 日志）写入 state.combat 与 state.logs。
 */
export type EncounterBattleFailure =
  | 'no_stamina'
  | 'no_party'
  | 'wounded'
  | 'unknown_event'
  | 'idle_active'; // 探索/挂机状态层互斥（combat-hygiene 06 / O#8）

export interface EncounterBattleOutcome {
  settlement: CombatSettlement | null;
  failure?: EncounterBattleFailure;
}

/**
 * 探索战斗汇合（ticket 06）：手动探索遭遇"战斗遭遇"事件时，进入与自动战斗同一战斗场景，
 * 沿用当前上阵三人小队。探索遭遇也属于战斗，消耗独立体力（ADR-0002），体力不足可撤离。
 * - 胜利 → 经验入账 + 战后修整回满血，掉落入探索临时背囊，探索继续（步数 +1）
 * - 战败（小队全灭）→ 小队全员重伤，探索终止；已获战利品并入避难所库存（不丢失）
 * - 平局（回合上限）→ 无奖励无重伤，探索继续
 */
export const resolveEncounterBattleUpdate = (
  state: GameState,
  encounterId: string,
  rng: () => number = Math.random
): UpdateResult<EncounterBattleOutcome> => {
  const battleConfig = REALITY_EVENTS[encounterId]?.battle;
  if (!battleConfig) return { state, result: { settlement: null, failure: 'unknown_event' } };

  // 状态层互斥（combat-hygiene 06 / O#8）：挂机运行中禁止探索遭遇扣体，防止绕过 UI 并发消耗。
  if (state.combat?.idle?.regionId || state.combat?.idle?.levelId) {
    return { state, result: { settlement: null, failure: 'idle_active' } };
  }

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if (getStamina(state) < COMBAT_CONFIG.encounterStaminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToEntities(battleConfig.enemies)
  );

  // 遭遇战掉落入探索临时背囊；体力按探索遭遇消耗（ADR-0002）
  const settled = settleBattle(state, battle, party, {
    staminaCost: COMBAT_CONFIG.encounterStaminaCost,
    drops: battleConfig.drops,
    soulEchoMin: 0,
    soulEchoMax: 0,
    expReward: battleConfig.expReward,
    lootTo: 'bag'
  }, rng);

  const nextHeroes = settled.nextHeroes;
  let nextInventory = { ...settled.nextInventory };
  let nextEquipmentInventory = { ...settled.nextEquipmentInventory };
  const nextBag = settled.nextBag;
  const expPerHero = battle.victory ? battleConfig.expReward : 0;

  if (battle.partyWiped) {
    // 战利品保留：临时背囊并入避难所库存（探索终止但掉落不丢失，ADR-0006）
    // 背囊中的可穿戴装备计数 → 实例化（ADR-0014 修订）
    const merged = addItemRewards(nextInventory, nextEquipmentInventory, nextBag);
    nextInventory = merged.inventory;
    nextEquipmentInventory = merged.equipmentInventory;
    Object.keys(nextBag).forEach(item => { delete nextBag[item]; });
  }

  const settlement: CombatSettlement = {
    battle,
    drops: settled.drops,
    soulEchoes: 0,
    expPerHero,
    woundedHeroIds: settled.woundedHeroIds
  };

  // 探索状态迁移：胜利/平局 → 继续探索（步数 +1）；战败 → 终止（战利品已入库）
  const continuing = !battle.partyWiped;
  const nextExploration = continuing
    ? {
        ...state.exploration,
        realitySteps: state.exploration.realitySteps + 1,
        realityEncounterId: null,
        realityBag: nextBag
      }
    : {
        ...state.exploration,
        inRealityExploration: false,
        realitySteps: 0,
        realityLocationId: null,
        realityEventId: null,
        realityEncounterId: null,
        realityBag: nextBag
      };

  let finalExploration: GameState['exploration'] = nextExploration;
  if (continuing && state.exploration.realityRegionId) {
    finalExploration = advanceRegionProgress({ ...state, exploration: nextExploration }, state.exploration.realityRegionId).exploration;
  }

  const eventTitle = REALITY_EVENTS[encounterId]?.title || '遭遇战';
  const logText = battle.victory
    ? `遭遇战胜利！小队击退【${eventTitle}】，获得 ${Object.entries(settled.drops).map(([id, q]) => `${id}×${q}`).join('、') || '少量材料'} 与经验 ×${expPerHero}，继续探索。`
    : battle.partyWiped
      ? `探索遭遇战失败！小队全灭于【${eventTitle}】，探索终止，已获战利品并入库存，小队进入重伤状态。`
      : `遭遇战平局！小队与【${eventTitle}】鏖战未分胜负，继续探索。`;
  const logEntry = makeCombatLog(logText);

  return {
    state: {
      ...state,
      stamina: settled.nextStamina,
      heroes: nextHeroes,
      inventory: nextInventory,
      equipmentInventory: nextEquipmentInventory,
      exploration: finalExploration,
      combat: { ...state.combat, regionId: null, levelId: null, clearedLevels: state.combat?.clearedLevels ?? {}, lastSettlement: settlement, idle: idleOrDefault(state) },
      logs: [logEntry, ...state.logs].slice(0, 100)
    },
    result: { settlement }
  };
};

// 撤离遭遇（ticket 06）：不战而退，探索继续（步数 +1），无奖励、无体力消耗、无重伤
export const fleeEncounterUpdate = (state: GameState): UpdateResult<boolean> => {
  if (!state.exploration.realityEncounterId) return NO_OP(state);
  const eventTitle = REALITY_EVENTS[state.exploration.realityEncounterId]?.title || '遭遇战';
  const logEntry = makeCombatLog(`小队撤离了遭遇【${eventTitle}】，绕行继续探索。`);
  return {
    state: {
      ...state,
      exploration: {
        ...state.exploration,
        realitySteps: state.exploration.realitySteps + 1,
        realityEncounterId: null
      },
      logs: [logEntry, ...state.logs].slice(0, 100)
    },
    result: true
  };
};

// === 确认式离线挂机（ticket 08）：玩家主动开启后，离线期间战斗才推进 ===
// 开启后离线按 battleDurationSeconds 一场接一场战斗；体力耗尽或小队战败自动停止；
// 玩家手动停止后剩余体力保留。结算复用同一战斗场景（simulateBattle + settleBattle）。

// 上阵队伍管理：最多 3 人、无重复、必须已拥有且未重伤
export const setPartyUpdate = (state: GameState, heroIds: string[]): UpdateResult<boolean> => {
  const unique = Array.from(new Set(heroIds));
  if (unique.length !== heroIds.length) return NO_OP(state);
  if (unique.length > COMBAT_CONFIG.partySize) return NO_OP(state);
  for (const id of unique) {
    const hero = state.heroes[id];
    if (!hero || hero.wounded || hero.logisticsFacilityId || !HEROES_CONFIG[id]) return NO_OP(state);
  }
  return { state: { ...state, party: unique }, result: true };
};

// 纳米修复剂治愈重伤英雄（改造后语义：治愈英雄重伤并恢复满血，见 ADR-0006）
export const healWoundedHeroUpdate = (state: GameState, heroId: string): UpdateResult<boolean> => {
  const hero = state.heroes[heroId];
  if (!hero || !hero.wounded) return NO_OP(state);
  if ((state.inventory.nanite_injector || 0) < 1) return NO_OP(state);

  const nextInventory = { ...state.inventory, nanite_injector: state.inventory.nanite_injector - 1 };
  const nextHeroes = { ...state.heroes, [heroId]: { ...hero, wounded: false, hp: hero.maxHp } };
  return { state: { ...state, inventory: nextInventory, heroes: nextHeroes }, result: true };
};

// 纳米修复剂批量治愈重伤英雄（ADR-0016）：消耗数量 = 勾选英雄数，全部校验通过才生效
export const healWoundedHeroesUpdate = (state: GameState, heroIds: string[]): UpdateResult<boolean> => {
  const ids = [...new Set(heroIds)]; // 去重防御（setPartyUpdate 先例）：重复 id 只治愈一次
  if (ids.length === 0) return NO_OP(state);
  if ((state.inventory.nanite_injector || 0) < ids.length) return NO_OP(state);
  for (const id of ids) {
    const hero = state.heroes[id];
    if (!hero || !hero.wounded) return NO_OP(state);
  }

  const nextInventory = { ...state.inventory, nanite_injector: state.inventory.nanite_injector - ids.length };
  const nextHeroes = { ...state.heroes };
  for (const id of ids) {
    const hero = state.heroes[id];
    nextHeroes[id] = { ...hero, wounded: false, hp: hero.maxHp };
  }
  return { state: { ...state, inventory: nextInventory, heroes: nextHeroes }, result: true };
};

// 经验手册使用（15 号）：消耗 exp_tome × count，为英雄增加 count × 每本经验（applyHeroExp 复用，升级发天赋点；溢出自动累计）。
// 每本经验值读自 ITEMS_CONFIG（useEffect.heroExp，数据驱动）。数量不足 / 无手册 / 未知英雄 → NO_OP。
export const consumeExpTomesUpdate = (state: GameState, heroId: string, count: number): UpdateResult<boolean> => {
  if (count <= 0) return NO_OP(state);
  const hero = state.heroes[heroId];
  const config = HEROES_CONFIG[heroId];
  if (!hero || !config) return NO_OP(state);
  const held = state.inventory.exp_tome || 0;
  if (held < count) return NO_OP(state);
  const expPerTome = ITEMS_CONFIG.exp_tome?.useEffect?.heroExp ?? 0;
  if (expPerTome <= 0) return NO_OP(state);

  const leveled = applyHeroExp(hero, config, expPerTome * count);
  const nextInventory = { ...state.inventory, exp_tome: held - count };
  return {
    state: { ...state, inventory: nextInventory, heroes: { ...state.heroes, [heroId]: leveled } },
    result: true
  };
};
