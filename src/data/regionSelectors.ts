import { REGION_CONFIGS } from './regions';
import type { LevelConfig, RegionConfig } from './regions';

const REGION_INDEX: Record<string, RegionConfig> = REGION_CONFIGS;
const ALL_REGIONS: RegionConfig[] = Object.values(REGION_INDEX);

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

/** 由关卡 local id 反查所在区域（本内容表内 local id 亦全局唯一）。 */
export const findRegionByLevelId = (levelId: string): RegionConfig | undefined =>
  ALL_REGIONS.find((region) =>
    region.levels.some((level) => level.id === levelId)
  );
