import type { GameState, HeroState, HeroEquipment, LogEntry, BattleResult, BattleHpEntry, CombatSettlement, CombatIdleState } from '../types/game';
import type { HeroConfig } from '../data/heroes';
import { HEROES_CONFIG } from '../data/heroes';
import type { CombatEnemyConfig, CombatDropConfig } from '../data/combatZones';
import { COMBAT_ZONES, COMBAT_ZONE_LIST } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { CombatBonus } from '../data/bonds';
import type { AwakenSkillConfig } from '../data/awakening';
import { aggregateBonus } from './bonds';
import type { EquipmentStats } from '../data/equipment';
import { getHeroEquipmentBonus } from './equipment';
import { getTalentBonus } from './talents';
import { getAwakenBonus, getAwakenSkill } from './awakening';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 战斗核心（ticket 05）：三人轮询回合制自动战斗 ===

// 纯战斗单位（英雄与敌人都映射为此形态参与模拟）
export interface CombatantState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  skill?: AwakenSkillConfig; // 觉醒专属战斗技能（ticket 12，仅英雄携带）
}

export type CombatFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_zone' | 'locked';

export interface CombatOutcome {  settlement: CombatSettlement | null;
  failure?: CombatFailure;
}

// 英雄属性成长：随等级线性提升（装备/天赋见 ticket 10/11）
export const heroMaxHp = (config: HeroConfig, level: number): number =>
  config.baseHp + (level - 1) * COMBAT_CONFIG.hpPerLevel;

export const heroAttack = (config: HeroConfig, level: number): number =>
  config.baseAttack + (level - 1) * COMBAT_CONFIG.attackPerLevel;

// 经验入账：累计经验并升级（升到下一级所需经验 = 当前等级 * expPerLevel）；
// 每次升级获得 1 天赋点（ticket 11：天赋点仅来自战斗经验）
export const applyHeroExp = (hero: HeroState, config: HeroConfig, exp: number): HeroState => {
  let level = hero.level;
  let curExp = hero.exp + exp;
  while (curExp >= level * COMBAT_CONFIG.expPerLevel) {
    curExp -= level * COMBAT_CONFIG.expPerLevel;
    level += 1;
  }
  const maxHp = heroMaxHp(config, level);
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

// 伤害公式：至少造成 1 点伤害
const dealDamage = (attack: number, defense: number): number =>
  Math.max(1, attack - defense);

/**
 * 轮询回合制战斗模拟（纯函数，无副作用）：
 * 每回合按固定顺序行动 —— 先按上阵顺序依次轮到英雄，再按配置顺序轮到敌人；
 * 英雄集火第一个存活敌人，敌人集火第一个存活英雄。全部敌人阵亡 → 胜利；
 * 全部英雄阵亡或达到回合上限 → 战败。rng 不参与战斗（掉落结算在调用方）。
 * 觉醒英雄（ticket 12）携带专属技能：冷却归零时发动（strike 单体重击 / aoe 群体 / heal 自身治疗），
 * 否则普通攻击；技能按自身行动轮计冷却。
 */
export const simulateBattle = (
  heroes: CombatantState[],
  enemies: CombatantState[],
  maxRounds: number = COMBAT_CONFIG.maxBattleRounds
): BattleResult => {
  const h = heroes.map(x => ({ ...x }));
  const e = enemies.map(x => ({ ...x }));
  const actions: BattleResult['actions'] = [];
  const hpTrack: BattleHpEntry[][] = [];
  const skillCooldown: Record<string, number> = {}; // 英雄 id -> 剩余冷却（按自身行动轮）
  let round = 0;

  // 记录当前全员 HP 快照（ticket 21 血条播放）
  const snapshot = (): BattleHpEntry[] => [
    ...h.map(x => ({
      id: x.id, side: 'hero' as const, name: x.name,
      hp: Math.max(0, x.hp), maxHp: x.maxHp
    })),
    ...e.map(x => ({
      id: x.id, side: 'enemy' as const, name: x.name,
      hp: Math.max(0, x.hp), maxHp: x.maxHp
    }))
  ];
  hpTrack.push(snapshot()); // 初始满血（战斗开始前）

  while (round < maxRounds) {
    round++;

    // 英雄方行动
    for (const hero of h) {
      if (hero.hp <= 0) continue;
      const target = e.find(en => en.hp > 0);
      if (!target) break;

      const cd = skillCooldown[hero.id] || 0;
      const skill = hero.skill;

      // 觉醒技能：冷却归零时发动
      if (skill && cd === 0) {
        skillCooldown[hero.id] = skill.cooldown;
        if (skill.type === 'strike') {
          const dmg = dealDamage(Math.round(hero.attack * skill.multiplier), target.defense);
          target.hp -= dmg;
          actions.push({
            round, actorSide: 'hero', actorId: hero.id, actorName: hero.name,
            targetName: target.name, damage: dmg, kind: 'skill', skillName: skill.name
          });
          hpTrack.push(snapshot());
        } else if (skill.type === 'aoe') {
          // 对全部存活敌人造成伤害
          for (const en of e) {
            if (en.hp <= 0) continue;
            const dmg = dealDamage(Math.round(hero.attack * skill.multiplier), en.defense);
            en.hp -= dmg;
            actions.push({
              round, actorSide: 'hero', actorId: hero.id, actorName: hero.name,
              targetName: en.name, damage: dmg, kind: 'skill', skillName: skill.name
            });
            hpTrack.push(snapshot());
          }
        } else if (skill.type === 'heal') {
          // 自身治疗：不超过生命上限
          const heal = Math.round(hero.maxHp * ((skill.healPercent || 0) / 100));
          const actual = Math.min(hero.maxHp - hero.hp, heal);
          hero.hp += actual;
          actions.push({
            round, actorSide: 'hero', actorId: hero.id, actorName: hero.name,
            targetName: hero.name, damage: actual, kind: 'heal', skillName: skill.name
          });
          hpTrack.push(snapshot());
        }
      } else {
        // 冷却递减 + 普通攻击
        skillCooldown[hero.id] = Math.max(0, cd - 1);
        const dmg = dealDamage(hero.attack, target.defense);
        target.hp -= dmg;
        actions.push({
          round,
          actorSide: 'hero',
          actorId: hero.id,
          actorName: hero.name,
          targetName: target.name,
          damage: dmg,
          kind: 'attack'
        });
        hpTrack.push(snapshot());
      }
    }
    // 全部敌人阵亡 → 本回合胜利
    if (e.every(en => en.hp <= 0)) break;

    // 敌人方行动
    for (const enemy of e) {
      if (enemy.hp <= 0) continue;
      const target = h.find(he => he.hp > 0);
      if (!target) break;
      const dmg = dealDamage(enemy.attack, target.defense);
      target.hp -= dmg;
      actions.push({
        round,
        actorSide: 'enemy',
        actorId: enemy.id,
        actorName: enemy.name,
        targetName: target.name,
        damage: dmg,
        kind: 'attack'
      });
      hpTrack.push(snapshot());
    }

    // 英雄全灭 → 战败
    if (!h.some(he => he.hp > 0)) break;
  }

  // 三种结局：敌人全灭=胜利；英雄全灭=战败；回合上限双方存活=平局（无重伤）
  return {
    victory: e.every(en => en.hp <= 0),
    partyWiped: !h.some(he => he.hp > 0),
    rounds: round,
    actions,
    hpTrack
  };
};

// 英雄 → 战斗单位（羁绊/装备/天赋/升星觉醒加成在战斗场景内生效：攻击/防御/生命按百分比放大，
// 装备提供平值属性；觉醒英雄附带专属技能；退出战斗即复原。ticket 10/11/12）
export const heroToCombatant = (heroId: string, hero: HeroState, bonus: CombatBonus = {}, gear: HeroEquipment | null = null): CombatantState => {
  const config = HEROES_CONFIG[heroId];
  // 调用方已通过 isKnownHero 过滤，config 必存在
  const { flat, percent } = gear ? getHeroEquipmentBonus(gear) : { flat: {} as EquipmentStats, percent: {} as CombatBonus };
  const talentPercent = getTalentBonus(heroId, hero);
  const awakenPercent = getAwakenBonus(heroId, hero);
  const attackFactor = 1 + ((bonus.attackPercent || 0) + (percent.attackPercent || 0) + (talentPercent.attackPercent || 0) + (awakenPercent.attackPercent || 0)) / 100;
  const defenseFactor = 1 + ((bonus.defensePercent || 0) + (percent.defensePercent || 0) + (talentPercent.defensePercent || 0) + (awakenPercent.defensePercent || 0)) / 100;
  const hpFactor = 1 + ((bonus.maxHpPercent || 0) + (percent.maxHpPercent || 0) + (talentPercent.maxHpPercent || 0) + (awakenPercent.maxHpPercent || 0)) / 100;
  const baseMaxHp = heroMaxHp(config, hero.level) + (flat.maxHp || 0);
  const maxHp = Math.round(baseMaxHp * hpFactor);
  return {
    id: heroId,
    name: config.name,
    // 当前血量按同比例缩放，保持战斗中已损比例不变
    hp: hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * maxHp) : maxHp,
    maxHp,
    attack: Math.round((heroAttack(config, hero.level) + (flat.attack || 0)) * attackFactor),
    defense: Math.round((config.baseDefense + (flat.defense || 0)) * defenseFactor),
    skill: getAwakenSkill(heroId, hero)
  };
};

// 英雄是否可参战：状态存在且配置表存在（防御旧存档/损坏数据）
const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

// 敌人配置 → 战斗单位（自动战斗区域与探索遭遇共用）
const enemiesToCombatants = (enemies: CombatEnemyConfig[]): CombatantState[] =>
  enemies.map(en => ({ id: en.id, name: en.name, hp: en.hp, maxHp: en.hp, attack: en.attack, defense: en.defense }));

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
  nextBag: Record<string, number>;
  nextHeroes: Record<string, HeroState>;
  nextSoulEchoes: number;
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
  const nextInventory = { ...state.inventory };
  const nextBag = { ...(state.exploration.realityBag || {}) };
  const nextHeroes = { ...state.heroes };
  let nextSoulEchoes = state.soulEchoes;
  const drops: Record<string, number> = {};
  const woundedHeroIds: string[] = [];
  let soulEchoesGained = 0;

  if (battle.victory) {
    // 胜利掉落：逐条掷骰（概率 + 数量）
    cfg.drops.forEach(drop => {
      if (rng() <= drop.chance) {
        const qty = drop.minQty + Math.floor(rng() * (drop.maxQty - drop.minQty + 1));
        drops[drop.itemId] = (drops[drop.itemId] || 0) + qty;
        const target = cfg.lootTo === 'bag' ? nextBag : nextInventory;
        target[drop.itemId] = (target[drop.itemId] || 0) + qty;
      }
    });
    // 灵魂残响掉落
    if (cfg.soulEchoMax > cfg.soulEchoMin) {
      const seRoll = cfg.soulEchoMin + Math.floor(rng() * (cfg.soulEchoMax - cfg.soulEchoMin + 1));
      soulEchoesGained = seRoll;
      nextSoulEchoes += seRoll;
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

  return { nextStamina, nextInventory, nextBag, nextHeroes, nextSoulEchoes, soulEchoesGained, drops, woundedHeroIds };
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
      heroes: settled.nextHeroes,
      soulEchoes: settled.nextSoulEchoes,
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
  const nextInventory = { ...settled.nextInventory };
  const nextBag = settled.nextBag;
  const expPerHero = battle.victory ? battleConfig.expReward : 0;

  if (battle.partyWiped) {
    // 战利品保留：临时背囊并入避难所库存（探索终止但掉落不丢失，ADR-0006）
    Object.entries(nextBag).forEach(([item, qty]) => {
      if (qty > 0) nextInventory[item] = (nextInventory[item] || 0) + qty;
    });
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
      soulEchoes: settled.nextSoulEchoes,
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
 * 开始挂机：校验区域/队伍/体力后开启挂机开关（仅记录意图，不立即战斗）。
 * 开启后离线期间（lastTick 之后）战斗才推进；未开启时离线不产生任何战斗结算。
 */
export const startIdleUpdate = (
  state: GameState,
  zoneId: string,
  now: number = Date.now()
): UpdateResult<IdleStartOutcome> => {
  if (state.combat?.idle?.zoneId) return { state, result: { ok: false, failure: 'already_idling' } };

  const zone = COMBAT_ZONES[zoneId];
  if (!zone) return { state, result: { ok: false, failure: 'unknown_zone' } };
  if (!isZoneUnlocked(state, zoneId)) return { state, result: { ok: false, failure: 'locked' } };

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { ok: false, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { ok: false, failure: 'wounded' } };
  if ((state.stamina || 0) < zone.staminaCost) return { state, result: { ok: false, failure: 'no_stamina' } };

  return {
    state: {
      ...state,
      combat: { ...state.combat, idle: { zoneId, startTime: now } }
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
      combat: { ...state.combat, idle: { zoneId: null, startTime: null } }
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
 * 离线挂机战斗结算（ticket 08）：仅在挂机开启的时段生效。
 * 战斗场数 = min(离线时长, maxIdleSettlementSeconds) / battleDurationSeconds，且受体力上限约束；
 * 胜利 → 掉落 + 灵魂残响 + 经验入账（战后修整满血）；战败 → 全员重伤并自动停止；
 * 体力耗尽 → 自动停止；未自动停止时挂机开关保留（下个离线时段继续）。
 */
export const settleIdleUpdate = (
  state: GameState,
  elapsedSeconds: number,
  rng: () => number = Math.random
): UpdateResult<IdleSettlementOutcome> => {
  const idle = state.combat?.idle;
  const zoneId = idle?.zoneId;
  if (!zoneId || elapsedSeconds <= 0) return { state, result: emptyIdleOutcome() };

  const zone = COMBAT_ZONES[zoneId];
  const party = (state.party || []).filter(id => isKnownHero(state, id));
  // 防御性兜底：区域未知 / 队伍为空 / 有重伤 → 无法继续挂机，自动停止且不结算
  if (!zone || party.length === 0 || party.some(id => state.heroes[id].wounded)) {
    return {
      state: { ...state, combat: { ...state.combat, idle: { zoneId: null, startTime: null } } },
      result: emptyIdleOutcome()
    };
  }

  const idleSeconds = Math.min(elapsedSeconds, COMBAT_CONFIG.maxIdleSettlementSeconds);
  const staminaBattles = Math.floor((state.stamina || 0) / zone.staminaCost);
  // 体力已不足一场（挂机开启后在线消耗致体力见底）→ 视为体力耗尽，自动停止且不结算
  if (staminaBattles === 0) {
    return {
      state: { ...state, combat: { ...state.combat, idle: { zoneId: null, startTime: null } } },
      result: { ...emptyIdleOutcome(), autoStopped: true, stopReason: 'stamina' as const }
    };
  }
  const battleCount = Math.min(
    Math.floor(idleSeconds / COMBAT_CONFIG.battleDurationSeconds),
    staminaBattles
  );

  const outcome = emptyIdleOutcome();
  const drops = outcome.drops;
  let next = state;

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
      heroes: settled.nextHeroes,
      soulEchoes: settled.nextSoulEchoes
    };
    outcome.battlesFought++;
    outcome.staminaConsumed += zone.staminaCost;

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

    // 体力耗尽（不足一场）→ 自动停止
    if (settled.nextStamina < zone.staminaCost) {
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
        idle: idleStopped ? { zoneId: null, startTime: null } : next.combat.idle
      }
    },
    result: outcome
  };
};

// 战斗状态构造时保留挂机开关（防御旧存档/损坏数据缺 idle 字段）
const idleOrDefault = (state: GameState): CombatIdleState =>
  state.combat?.idle || { zoneId: null, startTime: null };

// 上阵队伍管理：最多 3 人、无重复、必须已拥有且未重伤
export const setPartyUpdate = (state: GameState, heroIds: string[]): UpdateResult<boolean> => {
  const unique = Array.from(new Set(heroIds));
  if (unique.length !== heroIds.length) return NO_OP(state);
  if (unique.length > COMBAT_CONFIG.partySize) return NO_OP(state);
  for (const id of unique) {
    const hero = state.heroes[id];
    if (!hero || hero.wounded || !HEROES_CONFIG[id]) return NO_OP(state);
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

// 体力恢复（tick 与离线结算共用）：随时间线性恢复，封顶体力上限
export const recoverStamina = (stamina: number, maxStamina: number, elapsedSeconds: number): number =>
  Math.min(maxStamina, stamina + elapsedSeconds / COMBAT_CONFIG.staminaRegenSeconds);
