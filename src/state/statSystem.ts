/**
 * 废土魔导三层属性驱动引擎 (Three-Tier Attribute Engine)
 * 封装元属性 (Primary)、基础属性 (Base) 与特殊属性 (Special) 的底层映射逻辑。
 * 数据配置文件见 `src/data/statConfig.ts`。
 *
 * 修饰符系统（stat-bonus-unification）：所有加成来源统一产出 StatModifier[]，
 * 经 aggregateModifiers 聚合后由 calculateEntityStats 统一计算。
 */

import {
  DEFAULT_PRIMARY_ATTRIBUTES,
  DEFAULT_BASE_ATTRIBUTES,
  DEFAULT_SPECIAL_ATTRIBUTES,
  PRIMARY_STAT_SCALING_CONFIG,
  BUFF_LIMIT_CONFIG
} from '../data/statConfig';

export {
  DEFAULT_PRIMARY_ATTRIBUTES,
  DEFAULT_BASE_ATTRIBUTES,
  DEFAULT_SPECIAL_ATTRIBUTES,
  PRIMARY_STAT_SCALING_CONFIG
};

// === 1. 元属性 / 一级属性 (Primary Attributes) ===
export interface PrimaryAttributes {
  strength: number;      // 力量: 额外增加攻击、暴击倍率
  constitution: number;  // 体质: 额外增加生命、防御
  agility: number;       // 敏捷: 额外增加暴击概率、遭受暴击减免
  intelligence: number;  // 智慧: 额外增加魔力、奥术增幅
  willpower: number;     // 意志: 减免负面效果持续回合与数值
  transcendence: number; // 超越: 减免技能冷却与特殊依赖
}

// === 2. 基础属性 (Base Attributes) ===
export interface BaseAttributes {
  attack: number;     // 基础攻击面板
  defense: number;    // 基础防御面板
  maxHp: number;      // 基础最大生命
  maxMp: number;      // 基础最大魔力
  critRate: number;   // 基础暴击率 (如 0.05 代表 5%)
  critDmg: number;    // 基础暴击倍率 (如 1.50 代表 150%)
}

// === 3. 特殊/阵营属性 (Special Attributes) ===
export interface SpecialAttributes {
  arcaneBoost: number;          // 奥术增幅 (%)
  arcaneResistance: number;     // 奥术抵抗 (%)
  mechanicalLoad: number;       // 机械负荷 (%)
  mechanicalEvolution: number;  // 机械进化 (%)
  nightmareErosion: number;     // 梦魇侵蚀 (%)
  voidSpirit: number;           // 虚无灵体 / 伤害豁免 (%)
  spiritInspire: number;        // 英灵鼓舞 (%)
  astralGuidance: number;       // 星界引导 (%)
  soulsealDrive: number;        // 魂印驱动 (%)
}

// === 3.5 修饰符系统（stat-bonus-unification 01） ===

// 可被修饰的属性 = 三层输入全集（21 项）；派生属性（critResist/damageReduction 等）由计算产生、不可直接修饰
export type StatKey = keyof BaseAttributes | keyof PrimaryAttributes | keyof SpecialAttributes;

// 统一加成表达单元：flat 为绝对值（+5 攻击）；percent 为小数（0.10 = +10%），多来源加算
// source 为可选来源标注（如"废土利刃"、"钢铁壁垒"、"Lv10里程碑"），供 UI 展开时展示来源分解
export interface StatModifier {
  stat: StatKey;
  kind: 'flat' | 'percent';
  value: number;
  source?: string;
}

// 聚合中间态：每属性 flat/percent 总和
export interface StatModifiers {
  flat: number;
  percent: number;
}

export type ModifierMap = Partial<Record<StatKey, StatModifiers>>;

// 聚合：同属性 flat/percent 分别求和（percent 加算语义；clamp 由计算端在最终级执行）
export function aggregateModifiers(modifiers: StatModifier[]): ModifierMap {
  const acc: ModifierMap = {};
  for (const m of modifiers) {
    const entry = acc[m.stat] ?? (acc[m.stat] = { flat: 0, percent: 0 });
    entry[m.kind] += m.value;
  }
  return acc;
}

// 按来源分组的聚合结果：source -> stat -> { flat, percent }
// 供 UI 展开某属性时展示"来自哪些来源、各贡献多少"
export type SourceGroupedModifiers = Record<string, ModifierMap>;

const UNKNOWN_SOURCE = '未知来源';

// 按来源分组聚合：保留每条 modifier 的 source 信息，同来源同属性 flat/percent 分别求和
// 与 aggregateModifiers 互补：后者丢弃来源直接全局求和，用于 calculateEntityStats；
// 本函数保留来源维度，用于 UI 来源分解展示
export function aggregateModifiersBySource(modifiers: StatModifier[]): SourceGroupedModifiers {
  const acc: SourceGroupedModifiers = {};
  for (const m of modifiers) {
    const source = m.source ?? UNKNOWN_SOURCE;
    const group = acc[source] ?? (acc[source] = {});
    const entry = group[m.stat] ?? (group[m.stat] = { flat: 0, percent: 0 });
    entry[m.kind] += m.value;
  }
  return acc;
}

// 从按来源分组的结果中，提取某个属性的所有来源贡献（供 UI 展开单行时使用）
export function getStatSourcesByStat(
  grouped: SourceGroupedModifiers,
  stat: StatKey
): Array<{ source: string; flat: number; percent: number }> {
  const results: Array<{ source: string; flat: number; percent: number }> = [];
  for (const [source, statMap] of Object.entries(grouped)) {
    const entry = statMap[stat];
    if (entry && (entry.flat !== 0 || entry.percent !== 0)) {
      results.push({ source, flat: entry.flat, percent: entry.percent });
    }
  }
  return results;
}

// 属性展示元数据（数据驱动）：新增 StatKey 后 TS 强制在本表补一行
export const STAT_META: Record<StatKey, { label: string; percentDisplay?: boolean }> = {
  attack: { label: '攻击' },
  defense: { label: '防御' },
  maxHp: { label: '生命' },
  maxMp: { label: '魔力' },
  critRate: { label: '暴击率', percentDisplay: true },
  critDmg: { label: '暴击倍率', percentDisplay: true },
  strength: { label: '力量' },
  constitution: { label: '体质' },
  agility: { label: '敏捷' },
  intelligence: { label: '智慧' },
  willpower: { label: '意志' },
  transcendence: { label: '超越' },
  arcaneBoost: { label: '奥术增幅', percentDisplay: true },
  arcaneResistance: { label: '奥术抵抗', percentDisplay: true },
  mechanicalLoad: { label: '机械负荷', percentDisplay: true },
  mechanicalEvolution: { label: '机械进化', percentDisplay: true },
  nightmareErosion: { label: '梦魇侵蚀', percentDisplay: true },
  voidSpirit: { label: '虚无灵体', percentDisplay: true },
  spiritInspire: { label: '英灵鼓舞', percentDisplay: true },
  astralGuidance: { label: '星界引导', percentDisplay: true },
  soulsealDrive: { label: '魂印驱动', percentDisplay: true }
};

// 加成数值 → 展示文案（UI 共用）：遍历聚合结果生成，同属性 flat/percent 合并为一条
export const formatModifiers = (modifiers: StatModifier[]): string => {
  const agg = aggregateModifiers(modifiers);
  return (Object.keys(agg) as StatKey[])
    .map(stat => {
      const m = agg[stat]!;
      const meta = STAT_META[stat];
      const parts: string[] = [];
      if (m.flat !== 0) {
        const sign = m.flat > 0 ? '+' : '';
        parts.push(sign + (meta.percentDisplay ? `${Math.round(m.flat * 100)}%` : String(m.flat)));
      }
      if (m.percent !== 0) {
        const sign = m.percent > 0 ? '+' : '';
        parts.push(sign + `${Math.round(m.percent * 100)}%`);
      }
      return `${meta.label} ${parts.join('、')}`;
    })
    .join('、');
};

// === 4. 算完加成后的最终计算属性 (Calculated Entity Stats) ===
export interface CalculatedEntityStats extends BaseAttributes {
  critResist: number;             // 免暴击率 (%)
  damageReduction: number;        // 百分比减伤 (0~1)
  durationReduction: number;      // 负面持续回合减免 (%)
  effectReduction: number;        // 负面效果数值减免 (%)
  cooldownReduction: number;      // 技能冷却减免 (%)
  primaryAttributes: PrimaryAttributes;
  specialAttributes: SpecialAttributes;
}

export interface CalculateStatsParams {
  baseAttributes: BaseAttributes;
  primaryAttributes?: Partial<PrimaryAttributes>;
  specialAttributes?: Partial<SpecialAttributes>;
}

const PRIMARY_KEYS = ['strength', 'constitution', 'agility', 'intelligence', 'willpower', 'transcendence'] as const;
const PRIMARY_KEY_SET = new Set<string>(PRIMARY_KEYS);

/**
 * 纯函数：根据基础属性、元属性、特殊属性与修饰符计算最终加成后的面板。
 * modifiers 可缺省（此时结果与旧行为完全一致）；修饰符聚合后：
 * - 元属性修饰符放大该元属性的效果量（flat × (1+Σpercent) 并入自带值，再走映射）；
 * - 基础/特殊属性修饰符的 flat 先加、percent 后乘：final = (base + Σflat) × (1 + Σpercent)；
 * - clamp 在最终级统一执行。
 */
export function calculateEntityStats(params: CalculateStatsParams, modifiers: StatModifier[] = []): CalculatedEntityStats {
  const base = params.baseAttributes;
  const primary = { ...DEFAULT_PRIMARY_ATTRIBUTES, ...params.primaryAttributes };
  const special = { ...DEFAULT_SPECIAL_ATTRIBUTES, ...params.specialAttributes };

  // 修饰符聚合：元属性修饰符放大效果量；基础/特殊属性修饰符累计 flat 与 percent
  const agg = aggregateModifiers(modifiers);
  const effPrimary = { ...primary };
  const flatMods: Partial<Record<StatKey, number>> = {};
  const percentMods: Partial<Record<StatKey, number>> = {};
  for (const stat of Object.keys(agg) as StatKey[]) {
    const m = agg[stat]!;
    if (PRIMARY_KEY_SET.has(stat)) {
      effPrimary[stat as keyof PrimaryAttributes] =
        primary[stat as keyof PrimaryAttributes] + m.flat * (1 + m.percent);
    } else {
      flatMods[stat] = m.flat;
      percentMods[stat] = m.percent;
    }
  }

  // 元属性额外增加/影响基础属性 (使用 src/data/statConfig.ts 配置)
  const extraAttack = effPrimary.strength * PRIMARY_STAT_SCALING_CONFIG.STRENGTH_TO_ATTACK;
  const extraCritDmg = effPrimary.strength * PRIMARY_STAT_SCALING_CONFIG.STRENGTH_TO_CRIT_DMG;

  const extraMaxHp = effPrimary.constitution * PRIMARY_STAT_SCALING_CONFIG.CONSTITUTION_TO_MAX_HP;
  const extraDefense = effPrimary.constitution * PRIMARY_STAT_SCALING_CONFIG.CONSTITUTION_TO_DEFENSE;

  const extraCritRate = effPrimary.agility * PRIMARY_STAT_SCALING_CONFIG.AGILITY_TO_CRIT_RATE;
  const critResist = effPrimary.agility * PRIMARY_STAT_SCALING_CONFIG.AGILITY_TO_CRIT_RESIST;

  const extraMaxMp = effPrimary.intelligence * PRIMARY_STAT_SCALING_CONFIG.INTELLIGENCE_TO_MAX_MP;
  const extraArcaneBoost = effPrimary.intelligence * PRIMARY_STAT_SCALING_CONFIG.INTELLIGENCE_TO_ARCANE_BOOST;

  const durationReduction = effPrimary.willpower * PRIMARY_STAT_SCALING_CONFIG.WILLPOWER_TO_DURATION_REDUCE;
  const effectReduction = effPrimary.willpower * PRIMARY_STAT_SCALING_CONFIG.WILLPOWER_TO_EFFECT_REDUCE;

  const cooldownReduction = effPrimary.transcendence * PRIMARY_STAT_SCALING_CONFIG.TRANSCENDENCE_TO_COOLDOWN_REDUCE;

  const flatOf = (k: StatKey) => flatMods[k] ?? 0;
  const pctOf = (k: StatKey) => 1 + (percentMods[k] ?? 0);

  const finalAttack = Math.max(0, (base.attack + extraAttack + flatOf('attack')) * pctOf('attack'));
  const finalDefense = Math.max(0, (base.defense + extraDefense + flatOf('defense')) * pctOf('defense'));
  const finalMaxHp = Math.max(1, (base.maxHp + extraMaxHp + flatOf('maxHp')) * pctOf('maxHp'));
  const finalMaxMp = Math.max(0, (base.maxMp + extraMaxMp + flatOf('maxMp')) * pctOf('maxMp'));
  const finalCritRate = Math.min(
    BUFF_LIMIT_CONFIG.MAX_CRIT_RATE,
    Math.max(BUFF_LIMIT_CONFIG.MIN_CRIT_RATE, (base.critRate + extraCritRate + flatOf('critRate')) * pctOf('critRate'))
  );
  const finalCritDmg = Math.max(BUFF_LIMIT_CONFIG.MIN_CRIT_DMG, (base.critDmg + extraCritDmg + flatOf('critDmg')) * pctOf('critDmg'));

  // 特殊属性：同样应用 flat/percent（percent 加算、最终级 clamp ≥ 0）
  const calcSpecial = (key: keyof SpecialAttributes, extra = 0): number =>
    Math.max(0, (special[key] + extra + flatOf(key)) * pctOf(key));

  // 百分比减伤公式: DamageReduction = DEF / (100 + DEF)
  const damageReduction = finalDefense / (100 + finalDefense);

  return {
    attack: finalAttack,
    defense: finalDefense,
    maxHp: finalMaxHp,
    maxMp: finalMaxMp,
    critRate: finalCritRate,
    critDmg: finalCritDmg,
    critResist,
    damageReduction,
    durationReduction,
    effectReduction,
    cooldownReduction,
    primaryAttributes: effPrimary,
    specialAttributes: {
      arcaneBoost: calcSpecial('arcaneBoost', extraArcaneBoost),
      arcaneResistance: calcSpecial('arcaneResistance'),
      mechanicalLoad: calcSpecial('mechanicalLoad'),
      mechanicalEvolution: calcSpecial('mechanicalEvolution'),
      nightmareErosion: calcSpecial('nightmareErosion'),
      voidSpirit: calcSpecial('voidSpirit'),
      spiritInspire: calcSpecial('spiritInspire'),
      astralGuidance: calcSpecial('astralGuidance'),
      soulsealDrive: calcSpecial('soulsealDrive')
    }
  };
}
