/**
 * 初始状态种子（config-json-migration 批次④ 归位 configs/seed）。
 * 本文件仅转发兼容存量引用——终态收口时全仓切换至 configs/seed 后删除。
 */
export {
  INITIAL_PLAYER_STATS,
  createInitialHero,
  INITIAL_HEROES,
  INITIAL_STATE
} from '../configs/seed/initialState';