// 英雄成长配置（config-json-migration 批次② 归位）：
// - 公式函数 → src/state/heroGrowth.ts（运行时逻辑归位 state）；
// - 职阶成长系数表 → data/progression/growthByClass.json（经 progression.loader）；
// - 元属性作用说明 → configs/constants/heroDisplay.ts；
// 本文件仅转发兼容存量引用（批次④收口删除）。
export {
  getHeroGrowth,
  getLevelMilestoneBonus,
  getMilestoneModifiers,
  heroBaseAttributes
} from '../state/heroGrowth';
export { HERO_GROWTH_BY_CLASS } from '../configs/loaders/progression.loader';
export { PRIMARY_STAT_DESCRIPTIONS } from '../configs/constants/heroDisplay';
