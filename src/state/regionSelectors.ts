/**
 * 区域选择器（config-json-migration 批次③ 工单5：运行时查询逻辑归位 state）。
 * 数据源：configs/loaders/regions.loader（json 装配，authored order 由 regionInfo.order 内容字段承载）。
 */
import { REGION_CONFIGS } from '../configs/loaders/regions.loader';
import type { ExpeditionConfig, LevelConfig, RegionConfig } from '../configs/types/region.types';

const REGION_INDEX: Record<string, RegionConfig> = REGION_CONFIGS;
const ALL_REGIONS: RegionConfig[] = Object.values(REGION_CONFIGS);

/** 按主线顺序（order 升序）返回非测试区域。 */
export const getMainlineRegions = (): RegionConfig[] =>
  ALL_REGIONS
    .filter((region) => !region.isTestZone)
    .sort((a, b) => a.order - b.order);

export const getRegion = (regionId: string): RegionConfig | undefined =>
  REGION_INDEX[regionId];

/** 返回区域内的有序关卡数组；区域不存在时返回空数组。 */
export const getRegionLevels = (regionId: string): LevelConfig[] =>
  REGION_INDEX[regionId]?.levels ?? [];

export const getLevel = (regionId: string, levelId: string): LevelConfig | undefined =>
  REGION_INDEX[regionId]?.levels.find((level) => level.id === levelId);

/** 按远征地点 id 查找所属区域 id（迁移期仅 radar_station）。 */
export const findRegionIdByExpedition = (expeditionId: string): string | undefined => {
  for (const region of ALL_REGIONS) {
    if (region.expedition?.id === expeditionId) return region.id;
  }
  return undefined;
};

/** 按远征地点 id 查找 expedition 配置。 */
export const findRegionExpedition = (expeditionId: string): ExpeditionConfig | undefined => {
  for (const region of ALL_REGIONS) {
    if (region.expedition?.id === expeditionId) return region.expedition;
  }
  return undefined;
};

/** 所有测试专用区域（isTestZone），不进主线。 */
export const getTestRegions = (): RegionConfig[] =>
  ALL_REGIONS.filter((region) => region.isTestZone);

/** 由关卡 local id 反查所在区域（本内容表内 local id 亦全局唯一）。 */
export const findRegionByLevelId = (levelId: string): RegionConfig | undefined =>
  ALL_REGIONS.find((region) =>
    region.levels.some((level) => level.id === levelId)
  );
