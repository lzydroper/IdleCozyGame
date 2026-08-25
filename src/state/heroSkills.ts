/**
 * 英雄技能装配缝（heroes-skills spec §2）。
 *
 * resolveHeroSkills 是三技能的唯一解析出口：战斗装配（collectHeroAbilities）与
 * 预览弹窗共用其输出——「弹窗数字 = 战斗数字」由构造保证。四步固定顺序：
 *
 *   ① 解锁过滤 → ② growth 烘焙（只乘公式叶）→ ③ milestones 补丁 → ④ 天赋重写压轴
 *
 * 不动战斗引擎：一切养成数值在装配期烘焙，resolveEffect 的 effect.* 收集语义保持原样。
 */
import type { SkillRow, SkillCondition } from '../configs/types/entity.types';
import type { TalentRewrite } from '../configs/types/progression.types';
import type { HeroState } from '../types/game';
import {
  resolveAbilityConfig,
  type AbilityConfig,
  type FormulaTemplate,
  type ResolvedAbility
} from './abilityTypes';
import { getAbilityConfig } from '../configs/loaders/combat.loader';
import { HERO_SKILLS } from '../configs/loaders/entities.loader';
import { getTalentNodes } from './talents';

// === ① 解锁过滤 ===

/** 条件词汇全部键可选、AND 语义；缺省 = 出生即解锁（工单 02）。 */
export const isSkillConditionMet = (
  cond: SkillCondition | undefined,
  hero: Pick<HeroState, 'level' | 'star' | 'awakened'>
): boolean => {
  if (!cond) return true;
  if (cond.level !== undefined && hero.level < cond.level) return false;
  if (cond.star !== undefined && hero.star < cond.star) return false;
  if (cond.awakened !== undefined && cond.awakened && !hero.awakened) return false;
  return true;
};

// === ② growth 烘焙 ===

/** FormulaTemplate 种类 → 其数值字段名（attack.multiplier / maxHp.percent / flat.value）。 */
export const FORMULA_NUM_FIELD: Record<FormulaTemplate['kind'], string> = {
  attack: 'multiplier',
  maxHp: 'percent',
  flat: 'value'
};

export const isFormulaLeaf = (v: unknown): v is FormulaTemplate =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  typeof (v as { kind?: unknown }).kind === 'string' &&
  (v as { kind: string }).kind in FORMULA_NUM_FIELD;

/**
 * 深度遍历效果参数，仅对公式叶的数值字段乘 factor。
 * 精确边界：非公式的数值参数（持续回合/次数/触发概率）是内容常量，不吃 growth——
 * 要它们变，用 milestones 绝对值替换（spec §2 正交纪律）。
 */
export const scaleFormulaLeaves = (params: Record<string, unknown>, factor: number): Record<string, unknown> => {
  if (factor === 1) return params;
  const walk = (value: unknown): unknown => {
    if (isFormulaLeaf(value)) {
      const field = FORMULA_NUM_FIELD[value.kind];
      const scaled = (value as unknown as Record<string, unknown>);
      return { ...scaled, [field]: (scaled[field] as number) * factor };
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walk(v)])
      );
    }
    return value;
  };
  return walk(params) as Record<string, unknown>;
};

/** 两维独立乘算：×(1+perLevel×(等级−1)) ×(1+perStar×星数)。 */
export const growthFactor = (
  growth: SkillRow['growth'],
  hero: Pick<HeroState, 'level' | 'star'>
): number => {
  let factor = 1;
  if (growth?.perLevel) factor *= 1 + growth.perLevel * (hero.level - 1);
  if (growth?.perStar) factor *= 1 + growth.perStar * hero.star;
  return factor;
};

export const applyGrowthToAbility = (
  ability: ResolvedAbility,
  growth: SkillRow['growth'],
  hero: Pick<HeroState, 'level' | 'star'>
): ResolvedAbility => ({
  ...ability,
  effects: ability.effects.map(effect => ({ ...effect, params: scaleFormulaLeaves(effect.params, growthFactor(growth, hero)) }))
});

// === ③ milestones 补丁 ===

export const applyMilestonesToAbility = (
  ability: ResolvedAbility,
  milestones: SkillRow['milestones'],
  hero: Pick<HeroState, 'level' | 'star' | 'awakened'>
): ResolvedAbility => {
  if (!milestones || milestones.length === 0) return ability;
  let result = ability;
  for (const ms of milestones) {
    if (!ms || !isSkillConditionMet(ms.at, hero)) continue;
    const patch = ms.patch;
    result = {
      ...result,
      ...(patch.cooldown !== undefined ? { cooldown: patch.cooldown } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.targeting !== undefined ? { targeting: patch.targeting } : {}),
      ...(patch.cost !== undefined ? { cost: patch.cost } : {})
    };
  }
  return result;
};

// === ④ 天赋重写压轴 ===

/** 已投入 ≥1 点节点的重写清单，按天赋树节点顺序排列（工单 05）。 */
export const collectInvestedRewrites = (heroId: string, hero: HeroState): TalentRewrite[] =>
  getTalentNodes(heroId).flatMap(node =>
    (hero.talents?.[node.id] ?? 0) >= 1 ? node.rewrites ?? [] : []
  );

/**
 * 重写合并：priority 顶层覆盖；effects 按索引定位部分替换；未提及的原样保留。
 * 多个天赋重写同一技能时按传入顺序依次应用（后者覆盖前者）。
 */
export const applyRewritesToAbility = (
  ability: ResolvedAbility,
  rewrites: readonly TalentRewrite[]
): ResolvedAbility => {
  let result = ability;
  for (const rewrite of rewrites) {
    if (rewrite.targetAbilityId !== ability.abilityId) continue;
    result = {
      ...result,
      ...(rewrite.priority !== undefined ? { priority: rewrite.priority } : {}),
      ...(rewrite.description !== undefined ? { description: rewrite.description } : {}),
      effects: result.effects.map((effect, index) => {
        const replacement = rewrite.effects?.[String(index)];
        return replacement ? { ...replacement } : effect;
      })
    };
  }
  return result;
};

// === 单行全流程 ===

/** 一行 skills.json 的完整解析：浅合并 overrides → resolve → growth → milestones → rewrites。 */
export const resolveSkillRow = (
  base: AbilityConfig,
  row: SkillRow,
  hero: Pick<HeroState, 'level' | 'star' | 'awakened'> & { talents?: Record<string, number> },
  rewrites: readonly TalentRewrite[] = []
): ResolvedAbility => {
  const merged: AbilityConfig = row.overrides
    ? { ...base, ...(row.overrides as object), id: base.id }
    : base;
  const resolved = resolveAbilityConfig(merged);
  const grown = applyGrowthToAbility(resolved, row.growth, hero);
  const patched = applyMilestonesToAbility(grown, row.milestones, hero);
  return applyRewritesToAbility(patched, rewrites);
};

// === 编排入口 ===

/**
 * 三技能唯一装配出口。无 skills.json / 全部锁定 → 空数组（调用方保留普攻与兜底路径）。
 * 未解锁的行不产出 ResolvedAbility（不进战斗；弹窗走锁定态分支）。
 */
export const resolveHeroSkills = (heroId: string, hero: HeroState): ResolvedAbility[] => {
  const rows = HERO_SKILLS[heroId];
  if (!rows || rows.length === 0) return [];
  const rewrites = collectInvestedRewrites(heroId, hero);
  const out: ResolvedAbility[] = [];
  for (const row of rows) {
    if (!isSkillConditionMet(row.unlock, hero)) continue;
    const base = getAbilityConfig(row.abilityId);
    if (!base) continue; // devGuard 已在加载期拦截；运行时防御性跳过
    out.push(resolveSkillRow(base, row, hero, rewrites));
  }
  return out;
};
