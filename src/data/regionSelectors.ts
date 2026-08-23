/**
 * 区域选择器（config-json-migration 批次③ 工单5：运行时查询逻辑归位 state）。
 * 本文件仅转发兼容存量引用（批次④收口删除）。
 */
export {
  getMainlineRegions,
  getRegion,
  getRegionLevels,
  getLevel,
  findRegionIdByExpedition,
  findRegionExpedition,
  getTestRegions,
  findRegionByLevelId
} from '../state/regionSelectors';