/**
 * combat 域装配（config-json-migration 批次③ 3.1）：
 * abilities 开放集合域 glob 归并 + description 模板插值（04 号票 B1：数值唯一真相在 effects）。
 */
import type { AbilityConfig } from '../../state/abilityTypes';
import { devGuardTable } from './devGuard';

const abilityModules = import.meta.glob('../../data/combat/abilities/*.json', {
  eager: true
}) as Record<string, { default: AbilityConfig }>;

// 觉醒专属能力：仅英雄本人可用，无复用——能力本体内联在各英雄 awaken.json
// （创作 locality，新增英雄零跨目录引用），装配时并入统一注册表（运行时单一真相不变）。
const awakenAbilityModules = import.meta.glob('../../data/entities/heroes/*/awaken.json', {
  eager: true
}) as Record<string, { default: { ability?: AbilityConfig } }>;

const abilityRegistry: Record<string, AbilityConfig> = Object.fromEntries(
  Object.entries(abilityModules).map(([, mod]) => [mod.default.id, mod.default])
);
for (const mod of Object.values(awakenAbilityModules)) {
  const ab = mod.default.ability;
  if (ab?.id) abilityRegistry[ab.id] = ab;
}

export const ABILITY_CONFIGS: Record<string, AbilityConfig> = devGuardTable(
  'combat/abilities',
  abilityRegistry,
  { required: ['name', 'activation'] }
);

// description 模板插值：{attackPct} / {maxHpPct} / {flat} ← 同源 effects 参数。
const pct = (n: number): string => `${Math.round(n * 100)}%`;
for (const cfg of Object.values(ABILITY_CONFIGS)) {
  let desc = cfg.description ?? '';
  for (const eff of cfg.effects ?? []) {
    const amt = (
      eff.params as {
        amount?: { kind?: string; multiplier?: number; percent?: number; value?: number };
      }
    ).amount;
    if (!amt) continue;
    if (amt.kind === 'attack') desc = desc.replace('{attackPct}', pct(amt.multiplier ?? 0));
    if (amt.kind === 'maxHp') desc = desc.replace('{maxHpPct}', pct(amt.percent ?? 0));
    if (amt.kind === 'flat') desc = desc.replace('{flat}', String(amt.value));
  }
  cfg.description = desc;
}

export const BASIC_ATTACK: AbilityConfig = ABILITY_CONFIGS['basic_attack'];

export const getAbilityConfig = (abilityId: string): AbilityConfig | undefined =>
  ABILITY_CONFIGS[abilityId];

// === Buff 注册表（config-json-migration 批次③ / 07 号票：createEffects 退役，全数据驱动） ===
import type { BuffConfig } from '../../state/buffTypes';

const buffModules = import.meta.glob('../../data/combat/buffs/*.json', {
  eager: true
}) as Record<string, { default: BuffConfig }>;

export const BUFF_CONFIGS: Record<string, BuffConfig> = devGuardTable(
  'combat/buffs',
  Object.fromEntries(
    Object.entries(buffModules).map(([, mod]) => [mod.default.buffId, mod.default])
  ),
  { required: ['durationKind', 'triggers', 'effects'] }
);

export const getBuffConfig = (buffId: string): BuffConfig | undefined => BUFF_CONFIGS[buffId];
