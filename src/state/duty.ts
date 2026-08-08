import type { HeroDutyMeta, DutyScope } from '../data/heroes';
import { CROPS_CONFIG } from '../data/crops';
import type { FacilityType } from '../types/game';

// 统一解析后的加成值（已按岗位作用域聚合，同类型多条累加）
export interface DutyResolvedBonus {
  speedMultiplier: number;
  yieldMultiplier: number;
  costReduction: number;
  intervalReduction: number;
  lootChanceBonus: number;
}

export const EMPTY_DUTY_BONUS: DutyResolvedBonus = {
  speedMultiplier: 0,
  yieldMultiplier: 0,
  costReduction: 0,
  intervalReduction: 0,
  lootChanceBonus: 0
};

// 岗位上下文：解析时描述英雄当前驻守的岗位
export type DutyContext =
  | { role: 'facility'; facilityType: FacilityType }
  | { role: 'greenhouse'; cropId?: string }
  | { role: 'expedition' };

const scopeMatches = (scope: DutyScope, ctx: DutyContext): boolean => {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'facility':
      return ctx.role === 'facility' && ctx.facilityType === scope.facilityType;
    case 'greenhouse':
      if (ctx.role !== 'greenhouse') return false;
      // 未限定作物 → 对所有作物生效；限定作物 → 仅该作物生效
      return scope.cropId === undefined || ctx.cropId === scope.cropId;
    case 'expedition':
      return ctx.role === 'expedition';
    default:
      return false;
  }
};

// 解析英雄 dutyMeta 在当前岗位作用域下的加成（英雄后勤加成系统，作用域化）
export const resolveDutyBonuses = (
  dutyMeta: HeroDutyMeta | null | undefined,
  ctx: DutyContext
): DutyResolvedBonus => {
  if (!dutyMeta || !dutyMeta.bonuses || dutyMeta.bonuses.length === 0) return { ...EMPTY_DUTY_BONUS };
  const out: DutyResolvedBonus = { ...EMPTY_DUTY_BONUS };
  for (const b of dutyMeta.bonuses) {
    if (!scopeMatches(b.scope, ctx)) continue;
    out.speedMultiplier += b.speedMultiplier ?? 0;
    out.yieldMultiplier += b.yieldMultiplier ?? 0;
    out.costReduction += b.costReduction ?? 0;
    out.intervalReduction += b.intervalReduction ?? 0;
    out.lootChanceBonus += b.lootChanceBonus ?? 0;
  }
  return out;
};

// UI：将作用域化 bonuses 格式化为人类可读描述（如「生产速度 +25%」「熔炉生产速度 +30%」「温室额外产出 +25%」）
export const describeDutyBonuses = (dutyMeta: HeroDutyMeta | null | undefined): string => {
  if (!dutyMeta || !dutyMeta.bonuses || dutyMeta.bonuses.length === 0) return '';
  return dutyMeta.bonuses
    .map(b => {
      const scope =
        b.scope.kind === 'all' ? '' :
        b.scope.kind === 'facility' ? (b.scope.facilityType === 'smelter' ? '熔炉' : '组装台') :
        b.scope.kind === 'greenhouse' ? (b.scope.cropId ? `温室·${CROPS_CONFIG[b.scope.cropId]?.name || b.scope.cropId}` : '温室') :
        '远征';
      const parts: string[] = [];
      if (b.speedMultiplier) parts.push(`${scope}生产速度 +${Math.round(b.speedMultiplier * 100)}%`);
      if (b.yieldMultiplier) parts.push(`${scope}额外产出 +${Math.round(b.yieldMultiplier * 100)}%`);
      if (b.costReduction) parts.push(`${scope}配方消耗 -${Math.round(b.costReduction * 100)}%`);
      if (b.intervalReduction) parts.push(`${scope}拾荒间隔 -${Math.round(b.intervalReduction * 100)}%`);
      if (b.lootChanceBonus) parts.push(`${scope}稀有掉落 +${Math.round(b.lootChanceBonus * 100)}%`);
      return parts.join(' · ');
    })
    .filter(s => s.length > 0)
    .join('；');
};
