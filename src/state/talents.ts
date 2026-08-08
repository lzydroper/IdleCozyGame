import type { GameState, HeroState } from '../types/game';
import type { HeroClass } from '../types/game';
import { HEROES_CONFIG } from '../data/heroes';
import type { TalentNodeConfig, TalentGate } from '../data/talents';
import { TALENT_TRUNKS, HERO_TALENTS } from '../data/talents';
import type { CombatBonus } from '../data/bonds';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 职阶天赋树（ticket 11）：升级获得天赋点，投入职阶公共主干 + 英雄专属节点 ===
// 加点/撤点/重置均为纯函数；效果为百分比战斗加成，由 combat.ts 应用。

// 英雄的天赋树 = 职阶公共主干 + 该英雄专属节点（各英雄独立）
export const getTalentNodes = (heroId: string): TalentNodeConfig[] => {
  const config = HEROES_CONFIG[heroId];
  if (!config) return [];
  const trunk = TALENT_TRUNKS[config.heroClass as HeroClass] || [];
  const own = HERO_TALENTS[heroId] || [];
  return [...trunk, ...own];
};

// 节点当前投入点数（防御旧存档缺 talents 字段）
export const getTalentLevel = (hero: HeroState, nodeId: string): number => hero.talents?.[nodeId] || 0;

// 已投入总点数（重置用）
export const getInvestedPoints = (hero: HeroState): number =>
  Object.values(hero.talents || {}).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);

// 天赋加成汇总：所有已投入节点的每级效果 × 投入点数（百分比，战斗内生效）
export const getTalentBonus = (heroId: string, hero: HeroState): CombatBonus => {
  const bonus: CombatBonus = {};
  getTalentNodes(heroId).forEach(node => {
    const level = getTalentLevel(hero, node.id);
    if (level <= 0) return;
    if (node.effect.attackPercent) bonus.attackPercent = (bonus.attackPercent || 0) + node.effect.attackPercent * level;
    if (node.effect.defensePercent) bonus.defensePercent = (bonus.defensePercent || 0) + node.effect.defensePercent * level;
    if (node.effect.maxHpPercent) bonus.maxHpPercent = (bonus.maxHpPercent || 0) + node.effect.maxHpPercent * level;
  });
  return bonus;
};

// 前置是否满足：所有 requires 节点均已投入 ≥1 点
const prereqsMet = (hero: HeroState, node: TalentNodeConfig): boolean =>
  !node.requires || node.requires.every(req => getTalentLevel(hero, req) >= 1);

// 门控判定（07 号）：所有 gate 条件满足才放行（AND）
export const evaluateTalentGate = (hero: HeroState, gate: TalentGate[] | undefined): boolean => {
  if (!gate || gate.length === 0) return true;
  return gate.every(g => {
    switch (g.type) {
      case 'talent': return getTalentLevel(hero, g.nodeId) >= (g.minLevel ?? 1);
      case 'awakened': return !!hero.awakened;
      case 'heroLevel': return hero.level >= g.minLevel;
      case 'star': return hero.star >= g.minLevel;
    }
  });
};

// 第一个未满足的门控条件（07 号，UI 节点锁标记/提示用；无 gate 或全满足时返回 undefined）
export const firstUnmetTalentGate = (hero: HeroState, gate: TalentGate[] | undefined): TalentGate | undefined => {
  if (!gate) return undefined;
  return gate.find(g => !evaluateTalentGate(hero, [g]));
};

// 节点是否可加点（07 号）：requires（前置投入）与 gate（门控）都满足（AND）
export const isTalentNodeUnlocked = (hero: HeroState, node: TalentNodeConfig): boolean =>
  prereqsMet(hero, node) && evaluateTalentGate(hero, node.gate);

export type TalentAllocateFailure = 'unknown_hero' | 'unknown_node' | 'no_points' | 'maxed' | 'locked';

// 加点：消耗 1 天赋点，投入节点 +1（校验前置与上限）
export const allocateTalentUpdate = (state: GameState, heroId: string, nodeId: string): UpdateResult<TalentAllocateFailure | true> => {
  const hero = state.heroes[heroId];
  if (!hero) return { state, result: 'unknown_hero' as const };
  const node = getTalentNodes(heroId).find(n => n.id === nodeId);
  if (!node) return { state, result: 'unknown_node' as const };
  if ((hero.talentPoints || 0) < 1) return { state, result: 'no_points' as const };
  if (getTalentLevel(hero, nodeId) >= node.maxLevel) return { state, result: 'maxed' as const };
  if (!isTalentNodeUnlocked(hero, node)) return { state, result: 'locked' as const };

  return {
    state: {
      ...state,
      heroes: {
        ...state.heroes,
        [heroId]: {
          ...hero,
          talentPoints: hero.talentPoints - 1,
          talents: { ...(hero.talents || {}), [nodeId]: getTalentLevel(hero, nodeId) + 1 }
        }
      }
    },
    result: true
  };
};

export type TalentUnallocateFailure = 'unknown_hero' | 'unknown_node' | 'no_investment' | 'has_dependents';

// 撤点：返还 1 天赋点；若下游节点已投入（依赖本节点）则拒绝，保证树形结构完整
export const unallocateTalentUpdate = (state: GameState, heroId: string, nodeId: string): UpdateResult<TalentUnallocateFailure | true> => {
  const hero = state.heroes[heroId];
  if (!hero) return { state, result: 'unknown_hero' as const };
  const node = getTalentNodes(heroId).find(n => n.id === nodeId);
  if (!node) return { state, result: 'unknown_node' as const };
  if (getTalentLevel(hero, nodeId) < 1) return { state, result: 'no_investment' as const };

  // 存在依赖本节点且已投入的下游节点 → 不可撤
  const hasDependents = getTalentNodes(heroId).some(
    other => other.id !== nodeId && (other.requires || []).includes(nodeId) && getTalentLevel(hero, other.id) >= 1
  );
  if (hasDependents) return { state, result: 'has_dependents' as const };

  const nextTalents = { ...(hero.talents || {}) };
  nextTalents[nodeId] = getTalentLevel(hero, nodeId) - 1;
  if (nextTalents[nodeId] <= 0) delete nextTalents[nodeId];

  return {
    state: {
      ...state,
      heroes: {
        ...state.heroes,
        [heroId]: { ...hero, talentPoints: (hero.talentPoints || 0) + 1, talents: nextTalents }
      }
    },
    result: true
  };
};

// 重置：全部投入点数返还为未分配天赋点
export const resetTalentsUpdate = (state: GameState, heroId: string): UpdateResult<boolean> => {
  const hero = state.heroes[heroId];
  if (!hero) return NO_OP(state);
  const invested = getInvestedPoints(hero);
  if (invested === 0) return NO_OP(state);
  return {
    state: {
      ...state,
      heroes: { ...state.heroes, [heroId]: { ...hero, talentPoints: (hero.talentPoints || 0) + invested, talents: {} } }
    },
    result: true
  };
};
