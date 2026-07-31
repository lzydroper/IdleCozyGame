import type { GameState, HeroState, LogEntry, BattleResult, CombatSettlement } from '../types/game';
import type { HeroConfig } from '../data/heroes';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_ZONES } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 战斗核心（ticket 05）：三人轮询回合制自动战斗 ===

// 纯战斗单位（英雄与敌人都映射为此形态参与模拟）
export interface CombatantState {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export type CombatFailure = 'no_stamina' | 'no_party' | 'wounded' | 'unknown_zone';

export interface CombatOutcome {
  settlement: CombatSettlement | null;
  failure?: CombatFailure;
}

// 英雄属性成长：随等级线性提升（装备/天赋见 ticket 10/11）
export const heroMaxHp = (config: HeroConfig, level: number): number =>
  config.baseHp + (level - 1) * COMBAT_CONFIG.hpPerLevel;

export const heroAttack = (config: HeroConfig, level: number): number =>
  config.baseAttack + (level - 1) * COMBAT_CONFIG.attackPerLevel;

// 经验入账：累计经验并升级（升到下一级所需经验 = 当前等级 * expPerLevel）
export const applyHeroExp = (hero: HeroState, config: HeroConfig, exp: number): HeroState => {
  let level = hero.level;
  let curExp = hero.exp + exp;
  while (curExp >= level * COMBAT_CONFIG.expPerLevel) {
    curExp -= level * COMBAT_CONFIG.expPerLevel;
    level += 1;
  }
  const maxHp = heroMaxHp(config, level);
  // 升级带来的生命上限成长同步补回当前血量
  return { ...hero, level, exp: curExp, maxHp, hp: hero.hp + (maxHp - hero.maxHp) };
};

// 伤害公式：至少造成 1 点伤害
const dealDamage = (attack: number, defense: number): number =>
  Math.max(1, attack - defense);

/**
 * 轮询回合制战斗模拟（纯函数，无副作用）：
 * 每回合按固定顺序行动 —— 先按上阵顺序依次轮到英雄，再按配置顺序轮到敌人；
 * 英雄集火第一个存活敌人，敌人集火第一个存活英雄。全部敌人阵亡 → 胜利；
 * 全部英雄阵亡或达到回合上限 → 战败。rng 不参与战斗（掉落结算在调用方）。
 */
export const simulateBattle = (
  heroes: CombatantState[],
  enemies: CombatantState[],
  maxRounds: number = COMBAT_CONFIG.maxBattleRounds
): BattleResult => {
  const h = heroes.map(x => ({ ...x }));
  const e = enemies.map(x => ({ ...x }));
  const actions: BattleResult['actions'] = [];
  let round = 0;

  while (round < maxRounds) {
    round++;

    // 英雄方行动
    for (const hero of h) {
      if (hero.hp <= 0) continue;
      const target = e.find(en => en.hp > 0);
      if (!target) break;
      const dmg = dealDamage(hero.attack, target.defense);
      target.hp -= dmg;
      actions.push({
        round,
        actorSide: 'hero',
        actorId: hero.id,
        actorName: hero.name,
        actorEmoji: hero.emoji,
        targetName: target.name,
        damage: dmg
      });
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
        actorEmoji: enemy.emoji,
        targetName: target.name,
        damage: dmg
      });
    }

    // 英雄全灭 → 战败
    if (!h.some(he => he.hp > 0)) break;
  }

  // 三种结局：敌人全灭=胜利；英雄全灭=战败；回合上限双方存活=平局（无重伤）
  return {
    victory: e.every(en => en.hp <= 0),
    partyWiped: !h.some(he => he.hp > 0),
    rounds: round,
    actions
  };
};

const heroToCombatant = (heroId: string, hero: HeroState): CombatantState => {
  const config = HEROES_CONFIG[heroId];
  // 调用方已通过 isKnownHero 过滤，config 必存在
  return {
    id: heroId,
    name: config.name,
    emoji: config.emoji,
    hp: hero.hp,
    maxHp: hero.maxHp,
    attack: heroAttack(config, hero.level),
    defense: config.baseDefense
  };
};

// 英雄是否可参战：状态存在且配置表存在（防御旧存档/损坏数据）
const isKnownHero = (state: GameState, heroId: string): boolean =>
  !!state.heroes[heroId] && !!HEROES_CONFIG[heroId];

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

  const party = (state.party || []).filter(id => isKnownHero(state, id));
  if (party.length === 0) return { state, result: { settlement: null, failure: 'no_party' } };
  if (party.some(id => state.heroes[id].wounded)) return { state, result: { settlement: null, failure: 'wounded' } };
  if ((state.stamina || 0) < zone.staminaCost) return { state, result: { settlement: null, failure: 'no_stamina' } };

  const battle = simulateBattle(
    party.map(id => heroToCombatant(id, state.heroes[id])),
    zone.enemies.map(en => ({ id: en.id, name: en.name, emoji: en.emoji, hp: en.hp, maxHp: en.hp, attack: en.attack, defense: en.defense }))
  );

  const nextStamina = state.stamina - zone.staminaCost;
  const nextInventory = { ...state.inventory };
  const nextHeroes = { ...state.heroes };
  let nextSoulEchoes = state.soulEchoes;
  const drops: Record<string, number> = {};
  const woundedHeroIds: string[] = [];
  let soulEchoesGained = 0;

  if (battle.victory) {
    // 胜利掉落：逐条掷骰（概率 + 数量）
    zone.drops.forEach(drop => {
      if (rng() <= drop.chance) {
        const qty = drop.minQty + Math.floor(rng() * (drop.maxQty - drop.minQty + 1));
        drops[drop.itemId] = (drops[drop.itemId] || 0) + qty;
        nextInventory[drop.itemId] = (nextInventory[drop.itemId] || 0) + qty;
      }
    });
    // 灵魂残响掉落
    const seRoll = zone.soulEchoMin + Math.floor(rng() * (zone.soulEchoMax - zone.soulEchoMin + 1));
    soulEchoesGained = seRoll;
    nextSoulEchoes += seRoll;
    // 经验入账 + 战后修整恢复满血
    // 设计决策（ticket 05）：战斗为独立"场景"，胜利后小队整备回满血——
    // 失败才承担重伤代价；后续装备/治疗系统（ticket 10+）可改为跨场持续 HP
    party.forEach(id => {
      const leveled = applyHeroExp(nextHeroes[id], HEROES_CONFIG[id], zone.expReward);
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

  const settlement: CombatSettlement = {
    battle,
    drops,
    soulEchoes: soulEchoesGained,
    expPerHero: battle.victory ? zone.expReward : 0,
    woundedHeroIds
  };

  // 战斗日志入账
  const logText = battle.victory
    ? `⚔️ 战斗胜利！小队在【${zone.name}】击退敌人，获得 ${Object.entries(drops).map(([id, q]) => `${id}×${q}`).join('、') || '少量材料'}、灵魂残响 ×${soulEchoesGained} 与经验 ×${zone.expReward}。`
    : battle.partyWiped
      ? `💥 战斗失败！小队在【${zone.name}】全员倒下，进入重伤状态，需使用纳米修复剂治愈。`
      : `⚔️ 战斗平局！小队在【${zone.name}】鏖战至回合上限未分胜负，无战利品，亦无人重伤。`;
  const logEntry: LogEntry = {
    id: `${Date.now()}_${Math.random()}`,
    text: logText,
    timestamp: Date.now(),
    type: 'combat'
  };

  return {
    state: {
      ...state,
      stamina: nextStamina,
      inventory: nextInventory,
      heroes: nextHeroes,
      soulEchoes: nextSoulEchoes,
      combat: { zoneId, lastSettlement: settlement },
      logs: [logEntry, ...state.logs].slice(0, 100)
    },
    result: { settlement }
  };
};

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
