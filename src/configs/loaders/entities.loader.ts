/**
 * entities 开放集合域装配（config-json-migration 批次③ 工单4）：
 * 英雄五文件归并——文件夹分组定归属，身份取 heroInfo.id（路径透明）；
 * 缺省段语义：缺 duty/awaken/talent/growth 文件即对应段缺省。
 */
import type { EnemyConfig, AwakenConfig, SurvivorConfig, SkillRow } from '../../configs/types/entity.types';
import type { TalentNodeConfig } from '../../configs/types/progression.types';
import type { HeroConfig } from '../../configs/types/entity.types';
import { resolveArtOrDefault } from '../mappings/artMap';
import { devGuardTable } from './devGuard';

const enemyModules = import.meta.glob('../../data/entities/enemies/*.json', {
  eager: true
}) as Record<string, { default: EnemyConfig }>;

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = devGuardTable(
  'entities/enemies',
  Object.fromEntries(
    Object.entries(enemyModules).map(([, mod]) => [mod.default.id, mod.default])
  )
);

// === 英雄五文件 ===

type Json = Record<string, unknown>;

const heroInfoMods = import.meta.glob('../../data/entities/heroes/*/heroInfo.json', { eager: true }) as Record<
  string,
  { default: Json }
>;
const dutyMods = import.meta.glob('../../data/entities/heroes/*/duty.json', { eager: true }) as Record<
  string,
  { default: Json }
>;
const awakenMods = import.meta.glob('../../data/entities/heroes/*/awaken.json', { eager: true }) as Record<
  string,
  { default: Json }
>;
// awaken.json 原始形状：ability 本体内联（觉醒专属，无复用）；装配后以 abilityId 暴露给运行时。
type RawAwakenJson = {
  awakenedName: string;
  passive: AwakenConfig['passive'];
  ability?: { id: string };
};
const talentMods = import.meta.glob('../../data/entities/heroes/*/talent.json', { eager: true }) as Record<
  string,
  { default: unknown[] }
>;
const growthMods = import.meta.glob('../../data/entities/heroes/*/growth.json', { eager: true }) as Record<
  string,
  { default: Json }
>;
const skillsMods = import.meta.glob('../../data/entities/heroes/*/skills.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

// skills.json 守卫（heroes-skills spec §1.1 / v1.2 内联直配）：恒三行、slot 恰好各一次、
// 每行自带内联能力本体（id 非空、activation 合法；全局 id 查重在 combat.loader 合并时做）、
// unlock/growth/milestones 键与数值形状白名单校验。
const SKILL_CONDITION_KEYS = new Set(['level', 'star', 'awakened']);
const SKILL_PATCH_KEYS = new Set(['cooldown', 'priority', 'targeting', 'cost']);
const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;
const guardCondition = (heroId: string, where: string, cond: unknown): void => {
  if (cond === undefined) return;
  if (!cond || typeof cond !== 'object' || Array.isArray(cond)) {
    throw new Error(`[configs:heroes/${heroId}/skills] ${where} 条件必须是对象`);
  }
  for (const [k, v] of Object.entries(cond as Json)) {
    if (!SKILL_CONDITION_KEYS.has(k)) {
      throw new Error(`[configs:heroes/${heroId}/skills] ${where} 未知条件键 '${k}'（允许 level/star/awakened）`);
    }
    if (k === 'awakened') {
      if (typeof v !== 'boolean') throw new Error(`[configs:heroes/${heroId}/skills] ${where}.awakened 必须是布尔`);
    } else if (!isPositiveInt(v)) {
      throw new Error(`[configs:heroes/${heroId}/skills] ${where}.${k} 必须是 ≥1 的整数`);
    }
  }
};
export const guardSkillRows = (heroId: string, raw: unknown): SkillRow[] => {
  if (!import.meta.env.DEV) return raw as SkillRow[];
  const rows = raw as SkillRow[];
  if (!Array.isArray(rows) || rows.length !== 3) {
    throw new Error(`[configs:heroes/${heroId}/skills] 必须恰好 3 行（槽位 1/2/3），实际 ${Array.isArray(rows) ? rows.length : '非数组'}`);
  }
  const seenIds = new Set<string>();
  const seenSlots = new Set<number>();
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object') throw new Error(`[configs:heroes/${heroId}/skills] 行 #${index} 非对象`);
    if (typeof row.id !== 'string' || row.id.length === 0) {
      throw new Error(`[configs:heroes/${heroId}/skills] 行 #${index} 缺少非空字符串 id`);
    }
    if (seenIds.has(row.id)) throw new Error(`[configs:heroes/${heroId}/skills] 重复行 id '${row.id}'`);
    seenIds.add(row.id);
    if (![1, 2, 3].includes(row.slot)) {
      throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}' slot 必须是 1|2|3`);
    }
    if (seenSlots.has(row.slot)) throw new Error(`[configs:heroes/${heroId}/skills] 槽位 ${row.slot} 出现多行`);
    seenSlots.add(row.slot);
    const ability = row.ability;
    if (!ability || typeof ability !== 'object' || Array.isArray(ability)) {
      throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}' 缺少内联能力本体 ability`);
    }
    if (typeof ability.id !== 'string' || ability.id.length === 0) {
      throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.ability 缺少非空字符串 id`);
    }
    if (ability.activation !== 'active' && ability.activation !== 'passive') {
      throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.ability.activation 必须是 active 或 passive`);
    }
    guardCondition(heroId, `'${row.id}'.unlock`, row.unlock);
    if (row.growth !== undefined) {
      for (const [k, v] of Object.entries(row.growth as Json)) {
        if (k !== 'perLevel' && k !== 'perStar') {
          throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.growth 未知键 '${k}'（允许 perLevel/perStar）`);
        }
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.growth.${k} 必须是非负有限数`);
        }
      }
    }
    if (row.milestones !== undefined) {
      if (!Array.isArray(row.milestones)) {
        throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones 必须是数组`);
      }
      for (const [mi, ms] of row.milestones.entries()) {
        guardCondition(heroId, `'${row.id}'.milestones[${mi}].at`, ms?.at);
        const patch = ms?.patch;
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
          throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch 必须是对象`);
        }
        for (const [pk, pv] of Object.entries(patch as Json)) {
          if (!SKILL_PATCH_KEYS.has(pk)) {
            throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch 白名单外字段 '${pk}'（允许 cooldown/priority/targeting/cost）`);
          }
          if ((pk === 'cooldown' || pk === 'priority') && !Number.isInteger(pv)) {
            throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch.${pk} 必须是整数`);
          }
          if (pk === 'targeting' && typeof pv !== 'string') {
            throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch.targeting 必须是字符串`);
          }
          if (pk === 'cost') {
            const cost = pv as { resource?: unknown; amount?: unknown } | null;
            if (!cost || typeof cost.resource !== 'string' || !Number.isInteger(cost.amount) || (cost.amount as number) <= 0) {
              throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch.cost 形状必须是 {resource:string, amount:正整数}`);
            }
          }
        }
        if (Object.keys(patch as Json).length === 0) {
          throw new Error(`[configs:heroes/${heroId}/skills] '${row.id}'.milestones[${mi}].patch 不能为空对象`);
        }
      }
    }
  }
  return rows;
};

const folderOf = (path: string): string | null =>
  path.match(/entities\/heroes\/([^/]+)\//)?.[1] ?? null;

export const HEROES_CONFIG: Record<string, HeroConfig> = {};
export const AWAKEN_CONFIG: Record<string, AwakenConfig> = {};
export const HERO_TALENTS: Record<string, TalentNodeConfig[]> = {};
export const HERO_SKILLS: Record<string, SkillRow[]> = {};

const heroEntries: Array<{
  order: number;
  id: string;
  info: Json;
  duty?: { bonuses?: unknown[] };
  awaken?: RawAwakenJson;
  talent?: TalentNodeConfig[];
  growth?: { levelMilestones?: HeroConfig['levelMilestones'] };
  skills?: unknown;
}> = [];

for (const [path, mod] of Object.entries(heroInfoMods)) {
  const folder = folderOf(path);
  if (!folder) continue;
  const info = mod.default;
  const id = String(info.id);
  const duty = dutyMods[`../../data/entities/heroes/${folder}/duty.json`]?.default as
    | { bonuses?: HeroConfig['dutyMeta'] extends undefined ? never[] : NonNullable<HeroConfig['dutyMeta']>['bonuses'] }
    | undefined;
  const awaken = awakenMods[`../../data/entities/heroes/${folder}/awaken.json`]?.default as
    | unknown as RawAwakenJson
    | undefined;
  const talent = talentMods[`../../data/entities/heroes/${folder}/talent.json`]?.default as
    | TalentNodeConfig[]
    | undefined;
  const growth = growthMods[`../../data/entities/heroes/${folder}/growth.json`]?.default as
    | { levelMilestones?: HeroConfig['levelMilestones'] }
    | undefined;
  const skills = skillsMods[`../../data/entities/heroes/${folder}/skills.json`]?.default;

  heroEntries.push({
    order: typeof info.order === 'number' ? info.order : 999,
    id,
    info,
    duty,
    awaken,
    talent,
    growth,
    skills
  });
}

// 按 order 内容字段排序——英雄池/图鉴顺序与文件组织无关（路径透明 + 确定性）。
heroEntries.sort((a, b) => a.order - b.order);

for (const { id, duty, awaken, talent, growth, skills, info } of heroEntries) {
  const rawIcon = typeof info.icon === 'string' ? info.icon : undefined;
  HEROES_CONFIG[id] = {
    ...(info as unknown as HeroConfig),
    levelMilestones: growth?.levelMilestones ?? {},
    dutyMeta: { bonuses: (duty?.bonuses ?? []) as NonNullable<HeroConfig['dutyMeta']>['bonuses'] },
    icon: resolveArtOrDefault(rawIcon)
  };

  if (awaken?.ability?.id) {
    AWAKEN_CONFIG[id] = {
      awakenedName: awaken.awakenedName,
      passive: awaken.passive,
      abilityId: awaken.ability.id
    };
  }
  if (Array.isArray(talent)) HERO_TALENTS[id] = talent;
  const skillRows = skills !== undefined ? guardSkillRows(id, skills) : undefined;
  if (skillRows) HERO_SKILLS[id] = skillRows;

  // 觉醒配置（heroes-skills v1.2 双轨）：awaken.json 仍带 ability 的英雄走旧路径；
  // 本体已迁入 skills.json 槽3 的英雄（awaken.json 只留名字与被动）从槽3 行派生 abilityId。
  if (awaken?.ability?.id) {
    AWAKEN_CONFIG[id] = {
      awakenedName: awaken.awakenedName,
      passive: awaken.passive,
      abilityId: awaken.ability.id
    };
  } else if (awaken && skillRows) {
    const slot3 = skillRows.find(r => r.slot === 3);
    if (slot3) {
      AWAKEN_CONFIG[id] = {
        awakenedName: awaken.awakenedName,
        passive: awaken.passive,
        abilityId: slot3.ability.id
      };
    }
  }
}

export const STARTER_HERO_ID: string =
  Object.values(HEROES_CONFIG).find(cfg => (cfg as unknown as { starter?: boolean }).starter)?.id ?? 'nova';

// === 幸存者档案（ADR-0013） ===
import survivorsJson from '../../data/entities/survivors.json';

export const SURVIVORS_CONFIG = survivorsJson as unknown as SurvivorConfig[];
