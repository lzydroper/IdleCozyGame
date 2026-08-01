/**
 * 废土魔导三层属性驱动引擎 (Three-Tier Attribute Engine)
 * 封装元属性 (Primary)、基础属性 (Base) 与特殊属性 (Special) 的底层映射逻辑。
 */

// === 1. 元属性 / 一级属性 (Primary Attributes) ===
export interface PrimaryAttributes {
  strength: number;      // 力量: 额外增加攻击、暴击倍率
  constitution: number;  // 体质: 额外增加生命、防御
  agility: number;       // 敏捷: 额外增加暴击概率、遭受暴击减免
  intelligence: number;  // 智慧: 额外增加魔力、奥术增幅
  willpower: number;     // 意志: 减免负面效果持续回合与数值
  transcendence: number; // 超越: 减免技能冷却与特殊依赖
}

// 默认全 0 元属性基准
export const DEFAULT_PRIMARY_ATTRIBUTES: Readonly<PrimaryAttributes> = {
  strength: 0,
  constitution: 0,
  agility: 0,
  intelligence: 0,
  willpower: 0,
  transcendence: 0
};

// === 2. 基础属性 (Base Attributes) ===
export interface BaseAttributes {
  attack: number;     // 基础攻击面板
  defense: number;    // 基础防御面板
  maxHp: number;      // 基础最大生命
  maxMp: number;      // 基础最大魔力
  critRate: number;   // 基础暴击率 (如 0.05 代表 5%)
  critDmg: number;    // 基础暴击倍率 (如 1.50 代表 150%)
}

export const DEFAULT_BASE_ATTRIBUTES: Readonly<BaseAttributes> = {
  attack: 10,
  defense: 5,
  maxHp: 100,
  maxMp: 50,
  critRate: 0.05,
  critDmg: 1.50
};

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

export const DEFAULT_SPECIAL_ATTRIBUTES: Readonly<SpecialAttributes> = {
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

// === 4. 元属性加成映射配置 (可数据驱动调整) ===
export const PRIMARY_STAT_CONFIG = {
  STRENGTH_TO_ATTACK: 2.0,                  // 1 力量 = +2 攻击
  STRENGTH_TO_CRIT_DMG: 0.005,              // 1 力量 = +0.5% 暴击倍率
  CONSTITUTION_TO_MAX_HP: 10.0,             // 1 体质 = +10 最大生命
  CONSTITUTION_TO_DEFENSE: 1.0,             // 1 体质 = +1 防御
  AGILITY_TO_CRIT_RATE: 0.002,              // 1 敏捷 = +0.2% 暴击率
  AGILITY_TO_CRIT_RESIST: 0.001,            // 1 敏捷 = +0.1% 免暴率
  INTELLIGENCE_TO_MAX_MP: 5.0,              // 1 智慧 = +5 最大魔力
  INTELLIGENCE_TO_ARCANE_BOOST: 0.005,      // 1 智慧 = +0.5% 奥术增幅
  WILLPOWER_TO_DURATION_REDUCE: 0.005,      // 1 意志 = +0.5% 负面持续减免
  WILLPOWER_TO_EFFECT_REDUCE: 0.005,        // 1 意志 = +0.5% 负面数值减免
  TRANSCENDENCE_TO_COOLDOWN_REDUCE: 0.003  // 1 超越 = +0.3% 冷却减免
};

// === 5. 算完加成后的最终计算属性 (Calculated Entity Stats) ===
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
  primaryAttributes?: PrimaryAttributes;
  specialAttributes?: SpecialAttributes;
}

/**
 * 纯函数：根据基础属性、元属性与特殊属性计算最终加成后的面板
 */
export function calculateEntityStats(params: CalculateStatsParams): CalculatedEntityStats {
  const base = params.baseAttributes;
  const primary = { ...DEFAULT_PRIMARY_ATTRIBUTES, ...params.primaryAttributes };
  const special = { ...DEFAULT_SPECIAL_ATTRIBUTES, ...params.specialAttributes };

  // 元属性额外增加/影响基础属性
  const extraAttack = primary.strength * PRIMARY_STAT_CONFIG.STRENGTH_TO_ATTACK;
  const extraCritDmg = primary.strength * PRIMARY_STAT_CONFIG.STRENGTH_TO_CRIT_DMG;

  const extraMaxHp = primary.constitution * PRIMARY_STAT_CONFIG.CONSTITUTION_TO_MAX_HP;
  const extraDefense = primary.constitution * PRIMARY_STAT_CONFIG.CONSTITUTION_TO_DEFENSE;

  const extraCritRate = primary.agility * PRIMARY_STAT_CONFIG.AGILITY_TO_CRIT_RATE;
  const critResist = primary.agility * PRIMARY_STAT_CONFIG.AGILITY_TO_CRIT_RESIST;

  const extraMaxMp = primary.intelligence * PRIMARY_STAT_CONFIG.INTELLIGENCE_TO_MAX_MP;
  const extraArcaneBoost = primary.intelligence * PRIMARY_STAT_CONFIG.INTELLIGENCE_TO_ARCANE_BOOST;

  const durationReduction = primary.willpower * PRIMARY_STAT_CONFIG.WILLPOWER_TO_DURATION_REDUCE;
  const effectReduction = primary.willpower * PRIMARY_STAT_CONFIG.WILLPOWER_TO_EFFECT_REDUCE;

  const cooldownReduction = primary.transcendence * PRIMARY_STAT_CONFIG.TRANSCENDENCE_TO_COOLDOWN_REDUCE;

  const finalAttack = Math.max(0, base.attack + extraAttack);
  const finalDefense = Math.max(0, base.defense + extraDefense);
  const finalMaxHp = Math.max(1, base.maxHp + extraMaxHp);
  const finalMaxMp = Math.max(0, base.maxMp + extraMaxMp);
  const finalCritRate = Math.min(1.0, Math.max(0, base.critRate + extraCritRate));
  const finalCritDmg = Math.max(1.0, base.critDmg + extraCritDmg);

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
    primaryAttributes: primary,
    specialAttributes: {
      ...special,
      arcaneBoost: special.arcaneBoost + extraArcaneBoost
    }
  };
}
