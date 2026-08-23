// 后勤设施配置（config-json-migration 批次② 归位）：数据本体 data/shelter/facilities.json，
// 装配与 icon 注入收口 configs/loaders/shelter.loader——本文件仅转发兼容存量引用（批次④收口删除）。
export type { FacilityType, FacilityConfig, FacilityExpansionConfig } from '../configs/types/gameplay.types';
import type { FacilityType } from '../configs/types/gameplay.types';
import { FACILITIES_CONFIG } from '../configs/loaders/shelter.loader';

export { FACILITIES_CONFIG };
export const isFacilityType = (t: string): t is FacilityType => t in FACILITIES_CONFIG;