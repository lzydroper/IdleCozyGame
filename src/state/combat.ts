import type { GameState, HeroState, HeroEquipment, EquippedItem, LogEntry, BattleResult, CombatSettlement, CombatIdleState } from '../types/game';
import type { HeroConfig } from '../data/heroes';
import { HEROES_CONFIG } from '../data/heroes';
import type { CombatEnemyConfig, CombatDropConfig } from '../data/combatZones';
import { COMBAT_ZONES, COMBAT_ZONE_LIST } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { REALITY_EVENTS } from '../data/realityEvents';
import { getHeroEquipmentBonus, addItemRewards } from './equipment';
import { aggregateBonus } from './bonds';
import type { StatModifier, BaseAttributes, PrimaryAttributes, SpecialAttributes } from './statSystem';
import { calculateEntityStats } from './statSystem';
import { DEFAULT_BASE_ATTRIBUTES, DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';
import { collectBuffModifiers, type ActiveBuff } from './buffSystem';
import { ITEMS_CONFIG } from '../data/items';
import { heroBaseAttributes, getMilestoneModifiers } from '../data/heroGrowth';
import { getTalentBonus } from './talents';
import { getAwakenBonus, getAwakenAbilityId } from './awakening';
import type { UpdateResult } from './types';
import { NO_OP } from './types';
import { calculateInitiative, runTurnEngine } from './turnEngine';
import type { BattleUnitAbility, BattleUnitSnapshot, BattleUnitStats } from './turnEngine';
import { getAbilityConfig } from '../data/abilities';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { applyPassiveAbilities, collectPassiveBuffConfigs } from './abilityPassive';
import { createAbilityRuntime } from './abilityRuntime';
import { createBattleContext, type BattleContext } from './battleContext';
import { createBuffTriggerHooks } from './buffRuntime';
import { BUFF_CONFIGS } from './buffTypes';

// === 战斗核心（ticket 05）：三人轮询回合制自动战斗 ===

// 纯战斗单位（英雄与敌人都映射为此形态参与模拟）
export interface CombatantState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  abilities?: string[]; // 能力 id 列表（英雄装配与敌人/BOSS 共用入口）
  // 可重算快照（stat-bonus-unification B 方案 + 统一实体）：英雄与敌人同为「三层输入 + 常驻修饰符」配方，
  // 战斗内 buff/技能变化 → 更新 ActiveBuff 列表 → recomputeCombatant 重算，保证与面板规则一致。
  // 敌人元属性恒 0、无加成来源 → 重算恒等于入场值（幂等，无重算需求）；仅手动构造的裸单位无快照。
  snapshot?: CombatantSnapshot;
}

// 战斗单位配方：与详情面板同口径（元属性/特殊属性全接入），入场后可作为 buff 重算基准
export interface CombatantSnapshot {
  baseAttributes: BaseAttributes;
  primaryAttributes: PrimaryAttributes;
  specialAttributes: SpecialAttributes;
  permanentModifiers: StatModifier[]; // 常驻：羁绊/装备/天赋/觉醒
}

export type CombatFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_zone' | 'locked';

export interface CombatOutcome {  settlement: CombatSettlement | null;
  failure?: CombatFailure;
}

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

// 完整战斗面板：把三层算好的属性展平为 BattleUnitStats，供伤害效果直接读取。
const combatantStats = (combatant: CombatantState): BattleUnitStats => {
  if (!combatant.snapshot) {
    const defense = combatant.defense;
    return {
      attack: combatant.attack,
      defense,
      maxHp: combatant.maxHp,
      maxMp: 0,
      critRate: 0,
      critDmg: 1.5,
      critResist: 0,
      damageReduction: defense / (100 + defense),
      durationReduction: 0,
      effectReduction: 0,
      cooldownReduction: 0,
      strength: 0,
      constitution: 0,
      agility: 0,
      intelligence: 0,
      willpower: 0,
      transcendence: 0,
      arcaneBoost: 0,
      arcaneResistance: 0,
      mechanicalLoad: 0,
      mechanicalEvolution: 0,
      nightmareErosion: 0,
      voidSpirit: 0,
      spiritInspire: 0,
      astralGuidance: 0,
      soulsealDrive: 0
    };
  }

  const stats = calculateEntityStats(combatant.snapshot, combatant.snapshot.permanentModifiers);
  const sp = stats.specialAttributes;
  return {
    attack: combatant.attack,
    defense: combatant.defense,
    maxHp: combatant.maxHp,
    maxMp: Math.round(stats.maxMp),
    critRate: stats.critRate,
    critDmg: stats.critDmg,
    critResist: stats.critResist,
    damageReduction: stats.damageReduction,
    durationReduction: stats.durationReduction,
    effectReduction: stats.effectReduction,
    cooldownReduction: stats.cooldownReduction,
    strength: stats.primaryAttributes.strength,
    constitution: stats.primaryAttributes.constitution,
    agility: stats.primaryAttributes.agility,
    intelligence: stats.primaryAttributes.intelligence,
    willpower: stats.primaryAttributes.willpower,
    transcendence: stats.primaryAttributes.transcendence,
    arcaneBoost: sp.arcaneBoost,
    arcaneResistance: sp.arcaneResistance,
    mechanicalLoad: sp.mechanicalLoad,
    mechanicalEvolution: sp.mechanicalEvolution,
    nightmareErosion: sp.nightmareErosion,
    voidSpirit: sp.voidSpirit,
    spiritInspire: sp.spiritInspire,
    astralGuidance: sp.astralGuidance,
    soulsealDrive: sp.soulsealDrive
  };
};

// CombatantState → Turn 引擎单位快照：先机由上层计算（agility 公式 + clamp，上限 300）。
const combatantToTurnUnit = (
  combatant: CombatantState,
  faction: 'hero' | 'enemy'
): BattleUnitSnapshot => {
  const agility = combatant.snapshot?.primaryAttributes.agility ?? 0;
  const abilities: BattleUnitAbility[] = [
    resolveAbilityConfig(getAbilityConfig('basic_attack')!) as unknown as BattleUnitAbility
  ];
  for (const abilityId of combatant.abilities ?? []) {
    const config = getAbilityConfig(abilityId);
    if (config) {
      abilities.push(resolveAbilityConfig(config) as unknown as BattleUnitAbility);
    }
  }
  const stats = combatantStats(combatant);
  return {
    id: combatant.id,
    name: combatant.name,
    faction,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    initiative: calculateInitiative(agility, 0),
    abilities,
    stats,
    currentMp: stats.maxMp,
    statParams: combatant.snapshot
      ? {
          baseAttributes: { ...combatant.snapshot.baseAttributes },
          primaryAttributes: { ...combatant.snapshot.primaryAttributes },
          specialAttributes: { ...combatant.snapshot.specialAttributes },
          permanentModifiers: combatant.snapshot.permanentModifiers.map(m => ({ ...m }))
        }
      : undefined
  };
};

/**
 * 先机回合制战斗模拟（纯函数，无副作用）：
 * 委托 Turn 引擎驱动「轮次 → 回合 → 时机/事件」流程；默认行动入口复刻旧战斗行为
 * （英雄集火首个存活敌人，敌人集火首个存活英雄；觉醒技能冷却归零时发动）。
 * 结局：敌人全灭 → victory；英雄全灭 → defeat；轮次上限双方存活 → draw。
 * rng 以函数参数注入（掉落结算在调用方，本函数当前默认能力不使用 rng）。
 */
export const canActWithBuffs = (battle: BattleContext, unitId: string): boolean => {
  const stun = battle.getBuff(unitId, 'stun');
  return !stun || (stun.duration ?? 0) <= 0;
};

export const simulateBattle = (
  heroes: CombatantState[],
  enemies: CombatantState[],
  maxRounds: number = COMBAT_CONFIG.maxBattleRounds,
  rng: () => number = Math.random
): BattleResult => {
  const units: BattleUnitSnapshot[] = [
    ...heroes.map(combatant => combatantToTurnUnit(combatant, 'hero')),
    ...enemies.map(combatant => combatantToTurnUnit(combatant, 'enemy'))
  ];
  const passiveConfigs = collectPassiveBuffConfigs(
    units.flatMap(unit => unit.abilities as unknown as ResolvedAbility[])
  );
  let battle!: BattleContext;
  const abilityRuntime = createAbilityRuntime(() => battle);
  const result = runTurnEngine(units, {
    maxRounds,
    rng,
    setup(runtime) {
      battle = createBattleContext(
        runtime,
        {},
        { ...BUFF_CONFIGS, ...passiveConfigs },
        createBuffTriggerHooks(() => battle)
      );
      applyPassiveAbilities(battle, runtime.getLivingUnits());
      abilityRuntime.setup(runtime);
    },
    canAct: (unit) => canActWithBuffs(battle, unit.id),
    performAction: abilityRuntime.performAction
  });
  return {
    outcome: result.outcome,
    victory: result.outcome === 'victory',
    partyWiped: result.outcome === 'defeat',
    rounds: result.rounds,
    events: result.events
  };
};

// 统一实体构造原语（stat-bonus-unification 统一实体）：任意「三层属性 + 常驻修饰符」配方 → 战斗单位。
// 英雄与敌人同路径（敌人的元属性/特殊属性缺省为 statSystem 默认——全 0，无加成来源 → 面板 = 配置值）。
// hpRatio 保持已损比例（缺省满血）。skill 等英雄专属字段由调用方追加。
export const combatantFromSnapshot = (
  id: string,
  name: string,
  snapshot: CombatantSnapshot,
  hpRatio = 1
): CombatantState => {
  const stats = calculateEntityStats(snapshot, snapshot.permanentModifiers);
  const maxHp = Math.round(stats.maxHp);
  return {
    id,
    name,
    hp: Math.round(maxHp * Math.min(1, Math.max(0, hpRatio))),
    maxHp,
    attack: Math.round(stats.attack),
    defense: Math.round(stats.defense),
    snapshot
  };
};

// 英雄能力装配：普通攻击 + 觉醒技能（若觉醒）。未来天赋/装备触发被动在此追加接入点。
export const collectHeroAbilities = (heroId: string, hero: HeroState): string[] => {
  const abilities = ['basic_attack'];
  const awakenAbilityId = getAwakenAbilityId(heroId, hero);
  if (awakenAbilityId && getAbilityConfig(awakenAbilityId)) {
    abilities.push(awakenAbilityId);
  }
  return abilities;
};

// 英雄 → 战斗单位（羁绊/装备/天赋/升星觉醒加成统一为修饰符，经 statSystem 面板快照生效；
// 退出战斗即复原。stat-bonus-unification 02/03 + B 方案：单位持有可重算配方 snapshot，
// 面板 = 战斗初始值（元属性/特殊属性同口径接入））
export const heroToCombatant = (heroId: string, hero: HeroState, bonus: StatModifier[] = [], gear: HeroEquipment | null = null): CombatantState => {
  const config = HEROES_CONFIG[heroId];
  // 调用方已通过 isKnownHero 过滤，config 必存在

  // 配方（与详情面板同口径）：heroBaseAttributes 返回成长后六项（不含里程碑，里程碑走 modifier 管道）；
  // 元属性/特殊属性 = 英雄初始配置（里程碑加成经 getMilestoneModifiers 纳入 permanentModifiers）
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

  // 面板快照：统一聚合全部来源修饰符（羁绊/装备/天赋/觉醒均已直连）
  const snapshot: CombatantSnapshot = { baseAttributes, primaryAttributes, specialAttributes, permanentModifiers };
  const combatant = combatantFromSnapshot(
    heroId,
    config.name,
    snapshot,
    hero.maxHp > 0 ? hero.hp / hero.maxHp : 1 // 当前血量按同比例缩放，保持战斗中已损比例不变
  );
  return { ...combatant, abilities: collectHeroAbilities(heroId, hero) };
};

// 战斗内任意时刻重算面板（B 方案）：常驻修饰符 + 当前 buff 修饰符，一次管道计算。
// 无快照的单位（敌人/手动构造）原样返回；有快照则按已损比例更新 hp 与三属性。
export const recomputeCombatant = (combatant: CombatantState, activeBuffs: ActiveBuff[]): CombatantState => {
  if (!combatant.snapshot) return combatant;
  const { baseAttributes, primaryAttributes, specialAttributes, permanentModifiers } = combatant.snapshot;
  // 意志减免取基础面板（不含 buff）的 effectReduction，与入场口径一致
  const effectReduction = calculateEntityStats(
    { baseAttributes, primaryAttributes, specialAttributes },
    permanentModifiers
  ).effectReduction;
  const stats = calculateEntityStats(
    { baseAttributes, primaryAttributes, specialAttributes },
    [...permanentModifiers, ...collectBuffModifiers(activeBuffs, effectReduction)]
  );
  const maxHp = Math.round(stats.maxHp);
  // 当前血量按已损比例缩放（保持血线比例），并钳制到 [0, maxHp]
  const hp =
    combatant.maxHp > 0
      ? Math.max(0, Math.min(maxHp, Math.round((combatant.hp / combatant.maxHp) * maxHp)))
      : maxHp;
  return {
    ...combatant,
    hp,
    maxHp,
    attack: Math.round(stats.attack),
    defense: Math.round(stats.defense)
  };
};

// 英雄是否可参战：状态存在且配置表存在（防御旧存档/损坏数据）
const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

// 敌人配置 → 战斗单位（自动战斗区域与探索遭遇共用；与英雄同走统一实体原语，
// baseAttributes 缺省值 = DEFAULT_BASE_ATTRIBUTES（与英雄同口径），元属性/特殊属性缺省全 0，
// 快照配方供将来敌人 buff/debuff 重算）
const enemiesToCombatants = (enemies: CombatEnemyConfig[]): CombatantState[] =>
  enemies.map(en => ({
    ...combatantFromSnapshot(en.id, en.name, {
      baseAttributes: { ...DEFAULT_BASE_ATTRIBUTES, ...en.baseAttributes },
      primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, ...en.primaryAttributes },
      specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES, ...en.specialAttributes },
      permanentModifiers: en.modifiers ?? []
    }),
    abilities: en.abilities
  }));

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
  drops: CombatDropConfig[];
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
  const nextStamina = state.stamina - cfg.staminaCost;
  let nextInventory = { ...state.inventory };
  const nextEquipmentInventory = { ...state.equipmentInventory };
  const nextBag = { ...(state.exploration.realityBag || {}) };
  const nextHeroes = { ...state.heroes };
  const drops: Record<string, number> = {};
  const woundedHeroIds: string[] = [];
  let soulEchoesGained = 0;

  if (battle.victory) {
    // 胜利掉落：逐条掷骰（概率 + 数量）
    cfg.drops.forEach(drop => {
      if (rng() <= drop.chance) {
        const qty = drop.minQty + Math.floor(rng() * (drop.maxQty - drop.minQty + 1));
        drops[drop.itemId] = (drops[drop.itemId] || 0) + qty;
        if (cfg.lootTo === 'bag') {
          // 探索遭遇：bag 保持计数（装备 +0），折返合并时实例化
          nextBag[drop.itemId] = (nextBag[drop.itemId] || 0) + qty;
        } else {
          // 直入背包：可穿戴装备实例化（ADR-0014 修订）
          const r = addItemRewards(nextInventory, nextEquipmentInventory, { [drop.itemId]: qty });
          nextInventory = r.inventory;
          Object.assign(nextEquipmentInventory, r.equipmentInventory);
        }
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
export const startCombatUpdate = (
  state: GameState,
  zoneId: string,
  rng: () => number = Math.random
): UpdateResult<CombatOutcome> => {
  const zone = COMBAT_ZONES[zoneId];
  if (!zone) return { state, result: { settlement: null, failure: 'unknown_zone' } };
  if (!isZoneUnlocked(state, zoneId)) return { state, result: { settlement: null, failure: 'locked' } };

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if ((state.stamina || 0) < zone.staminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToCombatants(zone.enemies)
  );

  const settled = settleBattle(state, battle, party, {
    staminaCost: zone.staminaCost,
    drops: zone.drops,
    soulEchoMin: zone.soulEchoMin,
    soulEchoMax: zone.soulEchoMax,
    expReward: zone.expReward,
    lootTo: 'inventory'
  }, rng);

  const settlement: CombatSettlement = {
    battle,
    drops: settled.drops,
    soulEchoes: settled.soulEchoesGained,
    expPerHero: battle.victory ? zone.expReward : 0,
    woundedHeroIds: settled.woundedHeroIds
  };

  // 战斗日志入账
  const logText = battle.victory
    ? `战斗胜利！小队在【${zone.name}】击退敌人，获得 ${Object.entries(settled.drops).map(([id, q]) => `${id}×${q}`).join('、') || '少量材料'}、灵魂残响 ×${settled.soulEchoesGained} 与经验 ×${zone.expReward}。`
    : battle.partyWiped
      ? `战斗失败！小队在【${zone.name}】全员倒下，进入重伤状态，需使用纳米修复剂治愈。`
      : `战斗平局！小队在【${zone.name}】鏖战至回合上限未分胜负，无战利品，亦无人重伤。`;
  const logEntry = makeCombatLog(logText);

  return {
    state: {
      ...state,
      stamina: settled.nextStamina,
      inventory: settled.nextInventory,
      equipmentInventory: settled.nextEquipmentInventory,
      heroes: settled.nextHeroes,
      combat: { zoneId, lastSettlement: settlement, zonesCleared: state.combat?.zonesCleared || [], idle: idleOrDefault(state) },
      logs: [logEntry, ...state.logs].slice(0, 100)
    },
    result: { settlement }
  };
};

export type EncounterBattleFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_event';

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

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if ((state.stamina || 0) < COMBAT_CONFIG.encounterStaminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToCombatants(battleConfig.enemies)
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
      exploration: nextExploration,
      combat: { zoneId: encounterId, lastSettlement: settlement, zonesCleared: state.combat?.zonesCleared || [], idle: idleOrDefault(state) },
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

// 区域链解锁（ticket 07）：首区默认解锁，其余区域需通关上一区（按推荐等级升序线性链）；
// 已通关区域永久解锁（防止后续新增/插入区域时把老玩家的通关记录反向锁死）
export const isZoneUnlocked = (state: GameState, zoneId: string): boolean => {
  const zone = COMBAT_ZONES[zoneId];
  if (zone?.isTestZone) return true;
  const cleared = state.combat?.zonesCleared || [];
  if (cleared.includes(zoneId)) return true;
  const idx = COMBAT_ZONE_LIST.findIndex(z => z.id === zoneId);
  if (idx === -1) return false;
  if (idx === 0) return true;
  return cleared.includes(COMBAT_ZONE_LIST[idx - 1].id);
};

export type BossBattleFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_zone' | 'no_boss' | 'locked';

export interface BossBattleOutcome {
  settlement: CombatSettlement | null;
  failure?: BossBattleFailure;
}

/**
 * 关底 BOSS 战（ticket 07）：与普通战斗同一战斗场景（复用 simulateBattle/结算）。
 * 胜利 → BOSS 专属掉落 + 灵魂残响 + 经验入账、战后修整满血，并通关本区（解锁下一区）；
 * 战败 → 小队全员重伤（不损已得战利品）；可重复挑战已通关 BOSS 刷专属掉落。
 */
export const startBossBattleUpdate = (
  state: GameState,
  zoneId: string,
  rng: () => number = Math.random
): UpdateResult<BossBattleOutcome> => {
  const zone = COMBAT_ZONES[zoneId];
  if (!zone) return { state, result: { settlement: null, failure: 'unknown_zone' } };
  if (!zone.boss) return { state, result: { settlement: null, failure: 'no_boss' } };
  if (!isZoneUnlocked(state, zoneId)) return { state, result: { settlement: null, failure: 'locked' } };

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if ((state.stamina || 0) < zone.boss.staminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const boss = zone.boss;
  const battle = simulateBattle(
    party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
    enemiesToCombatants(boss.enemies)
  );

  const settled = settleBattle(state, battle, party, {
    staminaCost: boss.staminaCost,
    drops: boss.drops,
    soulEchoMin: boss.soulEchoMin,
    soulEchoMax: boss.soulEchoMax,
    expReward: boss.expReward,
    lootTo: 'inventory'
  }, rng);

  const settlement: CombatSettlement = {
    battle,
    drops: settled.drops,
    soulEchoes: settled.soulEchoesGained,
    expPerHero: battle.victory ? boss.expReward : 0,
    woundedHeroIds: settled.woundedHeroIds
  };

  // 通关记录：胜利即标记本区已通关（可重复挑战，记录不重复）
  const wasCleared = (state.combat?.zonesCleared || []).includes(zoneId);
  const zonesCleared = battle.victory && !wasCleared
    ? [...(state.combat?.zonesCleared || []), zoneId]
    : (state.combat?.zonesCleared || []);
  const nextZone = COMBAT_ZONE_LIST[COMBAT_ZONE_LIST.findIndex(z => z.id === zoneId) + 1];

  const logText = battle.victory
    ? `${wasCleared ? '再战' : '首通'}！小队击败【${boss.name}】${wasCleared ? '' : '，通关【' + zone.name + '】' + (nextZone ? `，解锁【${nextZone.name}】` : '')}，获得 ${Object.entries(settled.drops).map(([id, q]) => `${id}×${q}`).join('、') || '少量材料'}、灵魂残响 ×${settled.soulEchoesGained} 与经验 ×${boss.expReward}。`
    : battle.partyWiped
      ? `BOSS 战失败！小队在【${zone.name}】被【${boss.name}】全灭，进入重伤状态，需使用纳米修复剂治愈。`
      : `BOSS 战平局！小队与【${boss.name}】鏖战未分胜负。`;
  const logEntry = makeCombatLog(logText);

  return {
    state: {
      ...state,
      stamina: settled.nextStamina,
      inventory: settled.nextInventory,
      heroes: settled.nextHeroes,
      combat: { zoneId, lastSettlement: settlement, zonesCleared, idle: idleOrDefault(state) },
      logs: [logEntry, ...state.logs].slice(0, 100)
    },
    result: { settlement }
  };
};

// === 确认式离线挂机（ticket 08）：玩家主动开启后，离线期间战斗才推进 ===
// 开启后离线按 battleDurationSeconds 一场接一场战斗；体力耗尽或小队战败自动停止；
// 玩家手动停止后剩余体力保留。结算复用同一战斗场景（simulateBattle + settleBattle）。

export type IdleStartFailure = 'unknown_zone' | 'locked' | 'no_party' | 'wounded' | 'no_stamina' | 'already_idling';

export interface IdleStartOutcome {
  ok: boolean;
  failure?: IdleStartFailure;
}

/**
 * 开始挂机：校验区域已通关/队伍/体力后开启挂机开关（仅记录意图，不立即战斗）。
 * 开启后在线逐秒累计战斗时间，够一场结算一场；离线期间（lastTick 之后）也持续推进。
 * 仅允许在已通关区域挂机（修复：未通关区域不可开启自动挂机）。
 */
export const startIdleUpdate = (
  state: GameState,
  zoneId: string,
  now: number = Date.now()
): UpdateResult<IdleStartOutcome> => {
  if (state.combat?.idle?.zoneId) return { state, result: { ok: false, failure: 'already_idling' } };

  const zone = COMBAT_ZONES[zoneId];
  if (!zone) return { state, result: { ok: false, failure: 'unknown_zone' } };
  // 挂机必须已通关该区域（线性递进：通关后刷材料）
  const clearedZones = state.combat?.zonesCleared || [];
  if (!clearedZones.includes(zoneId)) return { state, result: { ok: false, failure: 'locked' } };

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { ok: false, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { ok: false, failure: 'wounded' } };
  if ((state.stamina || 0) < zone.staminaCost) return { state, result: { ok: false, failure: 'no_stamina' } };

  return {
    state: {
      ...state,
      combat: { ...state.combat, idle: { zoneId, startTime: now, accumulatedSeconds: 0 } }
    },
    result: { ok: true }
  };
};

/**
 * 停止挂机：清除挂机开关，剩余体力保留（不结算、不消耗）。
 */
export const stopIdleUpdate = (state: GameState): UpdateResult<boolean> => {
  if (!state.combat?.idle?.zoneId) return NO_OP(state);
  return {
    state: {
      ...state,
      combat: { ...state.combat, idle: { zoneId: null, startTime: null, accumulatedSeconds: 0 } }
    },
    result: true
  };
};

export interface IdleSettlementOutcome {
  battlesFought: number;
  victories: number;
  defeats: number;
  draws: number;
  drops: Record<string, number>;     // 累计掉落（已入账）
  soulEchoesGained: number;
  expPerHero: number;                // 每位上阵英雄累计获得经验
  staminaConsumed: number;
  autoStopped: boolean;              // 体力耗尽 / 战败 → 自动停止
  stopReason?: 'stamina' | 'defeat';
}

const emptyIdleOutcome = (): IdleSettlementOutcome => ({
  battlesFought: 0, victories: 0, defeats: 0, draws: 0,
  drops: {}, soulEchoesGained: 0, expPerHero: 0,
  staminaConsumed: 0, autoStopped: false
});

/**
 * 挂机战斗结算（ticket 08 + 修复 09）：在线逐秒累计（accumulatedSeconds），够一场 battleDurationSeconds 结算一场；
 * 离线传长时段秒数一次结算多场。胜利 → 掉落 + 灵魂残响 + 经验入账（战后修整满血）并写最近一场回放（lastSettlement）；
 * 战败 → 全员重伤并自动停止；体力耗尽 → 离线自动停止（autoStopOnEmptyStamina=true），在线保持等待体力恢复（false）。
 */
export const settleIdleUpdate = (
  state: GameState,
  elapsedSeconds: number,
  rng: () => number = Math.random,
  autoStopOnEmptyStamina: boolean = true
): UpdateResult<IdleSettlementOutcome> => {
  const idle = state.combat?.idle;
  const zoneId = idle?.zoneId;
  if (!zoneId || elapsedSeconds <= 0) return { state, result: emptyIdleOutcome() };

  const zone = COMBAT_ZONES[zoneId];
  const party = (state.party || []).filter(id => isKnownHero(state, id));
  // 防御性兜底：区域未知 / 队伍为空 / 有重伤 → 无法继续挂机，自动停止且不结算
  if (!zone || party.length === 0 || party.some(id => state.heroes[id].wounded)) {
    return {
      state: { ...state, combat: { ...state.combat, idle: { zoneId: null, startTime: null, accumulatedSeconds: 0 } } },
      result: emptyIdleOutcome()
    };
  }

  // 累计秒数：上次遗留 + 本次经过；封顶离线结算上限（等待期累计也被封顶，避免无限膨胀）
  const totalSeconds = (idle.accumulatedSeconds || 0) + elapsedSeconds;
  const cappedSeconds = Math.min(totalSeconds, COMBAT_CONFIG.maxIdleSettlementSeconds);
  const staminaBattles = Math.floor((state.stamina || 0) / zone.staminaCost);
  // 体力已不足一场 → 离线视为体力耗尽自动停止；在线保持挂机等待（体力恢复后继续，累计秒数保留）
  if (staminaBattles === 0) {
    if (!autoStopOnEmptyStamina) {
      return {
        state: {
          ...state,
          combat: { ...state.combat, idle: { ...idle, accumulatedSeconds: cappedSeconds } }
        },
        result: { ...emptyIdleOutcome(), battlesFought: 0 }
      };
    }
    return {
      state: { ...state, combat: { ...state.combat, idle: { zoneId: null, startTime: null, accumulatedSeconds: 0 } } },
      result: { ...emptyIdleOutcome(), autoStopped: true, stopReason: 'stamina' as const }
    };
  }
  const battleCount = Math.min(
    Math.floor(cappedSeconds / COMBAT_CONFIG.battleDurationSeconds),
    staminaBattles
  );
  // 未用满一战的秒数保留到下次（在线逐秒累积的关键）
  const leftoverSeconds = Math.min(
    totalSeconds - battleCount * COMBAT_CONFIG.battleDurationSeconds,
    COMBAT_CONFIG.maxIdleSettlementSeconds
  );

  const outcome = emptyIdleOutcome();
  const drops = outcome.drops;
  let next = state;
  let lastSettlement: CombatSettlement | null = null;

  for (let i = 0; i < battleCount; i++) {
    const battle = simulateBattle(
      party.map(id => heroToCombatant(id, next.heroes[id], aggregateBonus(party), next.equipment?.[id] || null)),
      enemiesToCombatants(zone.enemies)
    );
    const settled = settleBattle(next, battle, party, {
      staminaCost: zone.staminaCost,
      drops: zone.drops,
      soulEchoMin: zone.soulEchoMin,
      soulEchoMax: zone.soulEchoMax,
      expReward: zone.expReward,
      lootTo: 'inventory'
    }, rng);

    next = {
      ...next,
      stamina: settled.nextStamina,
      inventory: settled.nextInventory,
      equipmentInventory: settled.nextEquipmentInventory,
      heroes: settled.nextHeroes
    };
    outcome.battlesFought++;
    outcome.staminaConsumed += zone.staminaCost;

    // 写最近一场回放（挂机战斗后回放区可查看；与手动战斗共用 lastSettlement）
    lastSettlement = {
      battle,
      drops: settled.drops,
      soulEchoes: settled.soulEchoesGained,
      expPerHero: battle.victory ? zone.expReward : 0,
      woundedHeroIds: settled.woundedHeroIds
    };

    if (battle.victory) {
      outcome.victories++;
      Object.entries(settled.drops).forEach(([itemId, qty]) => {
        drops[itemId] = (drops[itemId] || 0) + qty;
      });
      outcome.soulEchoesGained += settled.soulEchoesGained;
    } else if (battle.partyWiped) {
      outcome.defeats++;
      outcome.autoStopped = true;
      outcome.stopReason = 'defeat';
      break;
    } else {
      outcome.draws++;
    }

    // 体力耗尽（不足一场）→ 离线自动停止；在线由调用方传 autoStopOnEmptyStamina=false 保持等待
    if (settled.nextStamina < zone.staminaCost && autoStopOnEmptyStamina) {
      outcome.autoStopped = true;
      outcome.stopReason = 'stamina';
      break;
    }
  }
  outcome.expPerHero = zone.expReward * outcome.victories; // 累计经验/英雄

  const idleStopped = outcome.autoStopped;
  return {
    state: {
      ...next,
      combat: {
        ...next.combat,
        lastSettlement: lastSettlement ?? next.combat.lastSettlement,
        idle: idleStopped
          ? { zoneId: null, startTime: null, accumulatedSeconds: 0 }
          : { ...idle, accumulatedSeconds: leftoverSeconds }
      }
    },
    result: outcome
  };
};

// 战斗状态构造时保留挂机开关（防御旧存档/损坏数据缺 idle 字段）
const idleOrDefault = (state: GameState): CombatIdleState =>
  state.combat?.idle || { zoneId: null, startTime: null, accumulatedSeconds: 0 };

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

// 体力恢复（tick 与离线结算共用）：随时间线性恢复，封顶体力上限
export const recoverStamina = (stamina: number, maxStamina: number, elapsedSeconds: number): number =>
  Math.min(maxStamina, stamina + elapsedSeconds / COMBAT_CONFIG.staminaRegenSeconds);