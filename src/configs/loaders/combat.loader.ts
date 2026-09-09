/**
 * combat 域装配（config-json-migration 批次③ 3.1）：
 * abilities 开放集合域 glob 归并（04 号票 B1）。
 * heroes-skills B5：description 保留原始模板（{attackPct} 等），插值全部移至渲染时
 * （state/abilityDescription.renderAbilityDescription）——加载期按基准值烘焙会顶掉
 * growth/milestones/重写后的实际数值，预览与战斗的同源口径以 ResolvedAbility 为准。
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

// heroes-skills v1.2：英雄技能内联直配——skills.json 各行自带能力本体，英雄专属不复用。
// 注册表降级为「派生运行时索引」：此处并入内联体（战斗日志按 id 查名等消费方不变），
// 跨英雄重复 id 在 DEV 直接抛错（创作目录已不存在，id 冲突即内容事故）。
const heroSkillsAbilityModules = import.meta.glob('../../data/entities/heroes/*/skills.json', {
  eager: true
}) as Record<string, { default: unknown }>;
for (const [path, mod] of Object.entries(heroSkillsAbilityModules)) {
  const rows = Array.isArray(mod.default) ? (mod.default as Array<{ ability?: AbilityConfig }>) : [];
  for (const row of rows) {
    const ab = row?.ability;
    if (!ab?.id) continue;
    if (import.meta.env.DEV && abilityRegistry[ab.id]) {
      throw new Error(`[configs:combat/abilities] 能力 id '${ab.id}' 重复（${path} 内联体与现有注册冲突）`);
    }
    abilityRegistry[ab.id] = ab;
  }
}

export const ABILITY_CONFIGS: Record<string, AbilityConfig> = devGuardTable(
  'combat/abilities',
  abilityRegistry,
  { required: ['name', 'activation'] }
);

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
