/**
 * 英雄技能视图模型（heroes-skills spec §4）：预览弹窗专用装配视图。
 * 复用 resolveSkillRow 单出口——弹窗数值与战斗严格同源。
 */
import type { SkillRow } from '../configs/types/entity.types';
import type { TalentRewrite } from '../configs/types/progression.types';
import type { HeroState } from '../types/game';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { getAbilityConfig } from '../configs/loaders/combat.loader';
import { HERO_SKILLS } from '../configs/loaders/entities.loader';
import {
  isSkillConditionMet,
  collectInvestedRewrites,
  resolveSkillRow
} from './heroSkills';

export const HERO_SKILL_SLOT_LABELS: Record<SkillRow['slot'], string> = {
  1: '技能 1',
  2: '技能 2',
  3: '觉醒技'
};

export interface HeroSkillView {
  row: SkillRow;
  slotLabel: string;
  unlocked: boolean;
  /** 解锁后：烘焙完成的运行时实例；锁定时 null（战斗同样不产出）。 */
  /** 解锁后：烘焙完成的运行时实例（growth/milestones/重写已应用）。 */
  ability: ResolvedAbility | null;
  /** 基准实例：未烘焙任何养成的原始解析（锁定态弹窗展示基准数值用）。 */
  baseAbility: ResolvedAbility | null;
  /** 命中该技能、且节点已投入的天赋重写（供弹窗高亮覆盖处）。 */
  rewrites: TalentRewrite[];
}

export const buildHeroSkillViews = (heroId: string, hero: HeroState): HeroSkillView[] => {
  const rows = HERO_SKILLS[heroId] ?? [];
  const rewrites = collectInvestedRewrites(heroId, hero);
  return rows.map(row => {
    const unlocked = isSkillConditionMet(row.unlock, hero);
    const base = getAbilityConfig(row.abilityId);
    // 基准实例：未烘焙养成的原始解析（锁定态弹窗展示基准数值）
    const baseAbility = base ? resolveAbilityConfig(base) : null;
    return {
      row,
      slotLabel: HERO_SKILL_SLOT_LABELS[row.slot],
      unlocked,
      ability: unlocked && base ? resolveSkillRow(base, row, hero, rewrites) : null,
      baseAbility,
      rewrites: rewrites.filter(rw => rw.targetAbilityId === row.abilityId)
    };
  });
};

/** 解锁条件的可读文案（锁定态展示）。 */
export const formatSkillCondition = (cond: SkillRow['unlock']): string | null => {
  if (!cond) return null;
  const parts: string[] = [];
  if (cond.level !== undefined) parts.push(`等级 ≥${cond.level}`);
  if (cond.star !== undefined) parts.push(`星级 ≥${cond.star}`);
  if (cond.awakened) parts.push('完成觉醒');
  return parts.length > 0 ? parts.join(' 且 ') : null;
};
