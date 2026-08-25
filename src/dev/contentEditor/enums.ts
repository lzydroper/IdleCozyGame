/**
 * 编辑器用闭集枚举词表（与 src/types、state 层类型保持一致；改动时同步）。
 */

export const HERO_CLASSES = ['guardian', 'attacker', 'conductor'] as const;
export const FACTIONS = ['arcane', 'mechanical', 'nightmare', 'spirit', 'astral', 'soulseal'] as const;
export const ENEMY_ROLES = ['normal', 'boss', 'nightmare'] as const;
export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'trinket'] as const;
export const ITEM_CATEGORIES = ['item', 'resource', 'shard', 'equipment'] as const;
export const SURVIVOR_ROLES = ['farmer', 'engineer', 'scout', 'guard', 'chemist', 'scavenger'] as const;

/** StatModifier 可修饰属性（21 项全集，statSystem.StatKey） */
export const STAT_KEYS = [
  // 基础
  'attack',
  'defense',
  'maxHp',
  'maxMp',
  'critRate',
  'critDmg',
  // 元属性
  'strength',
  'constitution',
  'agility',
  'intelligence',
  'willpower',
  'transcendence',
  // 特殊/阵营
  'arcaneBoost',
  'arcaneResistance',
  'mechanicalLoad',
  'mechanicalEvolution',
  'nightmareErosion',
  'voidSpirit',
  'spiritInspire',
  'astralGuidance',
  'soulsealDrive'
] as const;

/** Buff 触发时机（turnEngine 固定骨架 + 标准事件键；TurnEventKey 允许扩展 → allowFree） */
export const TIMING_KEYS = [
  'roundStart',
  'turnStart',
  'turnActive',
  'turnEnd',
  'roundEnd',
  'abilityUsed',
  'attackAfter',
  'damageTaken',
  'healingTaken',
  'death',
  'summon',
  'effectApplied'
] as const;

/** EffectKind 十种（effectSystem） */
export const EFFECT_KINDS = [
  'damage',
  'heal',
  'statModify',
  'stun',
  'dispel',
  'immunityElement',
  'immunityBuff',
  'taunt',
  'summon',
  'applyBuff'
] as const;

export const TARGETING_OPTIONS = [
  'enemy:first',
  'enemy:all',
  'enemy:lowestHp',
  'ally:self',
  'ally:lowestHpPercent',
  'ally:all'
] as const;

export const DAMAGE_ELEMENTS = ['physical', 'arcane', 'mechanical', 'nightmare', 'spirit', 'astral', 'soulseal'] as const;

/** 公式对象模板（能力 params / Buff params 共用词表） */
export const FORMULA_TEMPLATES: { label: string; value: unknown }[] = [
  { label: '{kind:attack, multiplier}', value: { kind: 'attack', multiplier: 1 } },
  { label: '{kind:maxHp, percent}', value: { kind: 'maxHp', percent: 0.1 } },
  { label: '{kind:flat, value}', value: { kind: 'flat', value: 10 } },
  { label: 'Buff:{kind:perStack, base}', value: { kind: 'perStack', base: 30 } },
  { label: 'Buff:{kind:livingEnemies, per}', value: { kind: 'livingEnemies', per: 5 } }
];
