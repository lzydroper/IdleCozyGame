/**
 * entities 开放集合域装配（config-json-migration 批次③ 工单4）：
 * 英雄五文件归并——文件夹分组定归属，身份取 heroInfo.id（路径透明）；
 * 缺省段语义：缺 duty/awaken/talent/growth 文件即对应段缺省。
 */
import type { EnemyConfig, AwakenConfig, SurvivorConfig } from '../../configs/types/entity.types';
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

const folderOf = (path: string): string | null =>
  path.match(/entities\/heroes\/([^/]+)\//)?.[1] ?? null;

export const HEROES_CONFIG: Record<string, HeroConfig> = {};
export const AWAKEN_CONFIG: Record<string, AwakenConfig> = {};
export const HERO_TALENTS: Record<string, TalentNodeConfig[]> = {};

const heroEntries: Array<{
  order: number;
  id: string;
  info: Json;
  duty?: { bonuses?: unknown[] };
  awaken?: RawAwakenJson;
  talent?: TalentNodeConfig[];
  growth?: { levelMilestones?: HeroConfig['levelMilestones'] };
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

  heroEntries.push({
    order: typeof info.order === 'number' ? info.order : 999,
    id,
    info,
    duty,
    awaken,
    talent,
    growth
  });
}

// 按 order 内容字段排序——英雄池/图鉴顺序与文件组织无关（路径透明 + 确定性）。
heroEntries.sort((a, b) => a.order - b.order);

for (const { id, duty, awaken, talent, growth, info } of heroEntries) {
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
}

export const STARTER_HERO_ID: string =
  Object.values(HEROES_CONFIG).find(cfg => (cfg as unknown as { starter?: boolean }).starter)?.id ?? 'nova';

// === 幸存者档案（ADR-0013） ===
import survivorsJson from '../../data/entities/survivors.json';

export const SURVIVORS_CONFIG = survivorsJson as unknown as SurvivorConfig[];
