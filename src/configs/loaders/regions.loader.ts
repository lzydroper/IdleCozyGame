/**
 * regions 域装配（config-json-migration 批次③ 工单5）：
 * NN_ 文件夹仅为人读约定——归并按 regionInfo.json 内容（id/order）组装并排序（路径透明原则）。
 * expedition 缺省段语义：无 expedition.json 即无远征点。
 */
import type { RegionConfig } from '../../configs/types/region.types';
import { devGuardTable } from './devGuard';

type Json = Record<string, unknown>;

const infoMods = import.meta.glob('../../data/regions/*/regionInfo.json', { eager: true }) as Record<
  string,
  { default: Json }
>;
const levelMods = import.meta.glob('../../data/regions/*/levels.json', { eager: true }) as Record<
  string,
  { default: unknown[] }
>;
const expeditionMods = import.meta.glob('../../data/regions/*/expedition.json', { eager: true }) as Record<
  string,
  { default: Json }
>;

export const REGION_CONFIGS: Record<string, RegionConfig> = {};

for (const [path, mod] of Object.entries(infoMods)) {
  const folder = path.match(/regions\/([^/]+)\/regionInfo\.json/)?.[1];
  if (!folder) continue;
  const info = mod.default as unknown as RegionConfig;
  const levels = levelMods[`../../data/regions/${folder}/levels.json`]?.default as RegionConfig['levels'];
  const expedition = expeditionMods[`../../data/regions/${folder}/expedition.json`]?.default as
    | unknown
    | undefined;

  REGION_CONFIGS[info.id] = {
    ...info,
    levels: levels ?? [],
    ...(expedition !== undefined ? { expedition: expedition as RegionConfig['expedition'] } : {})
  };
}

devGuardTable('regions', REGION_CONFIGS, { required: ['name', 'order'] });
