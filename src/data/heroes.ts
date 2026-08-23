/**
 * 英雄配置（config-json-migration 批次③ 工单4 归位）：
 * 五文件数据本体 data/entities/heroes/<id>/，装配收口 configs/loaders/entities.loader；
 * 展示常量在 configs/constants/heroDisplay——本文件仅转发兼容存量引用（批次④收口删除）。
 */
export type { HeroConfig, DutyScope, DutyBonus, HeroDutyMeta } from '../configs/types/entity.types';
export {
  HEROES_CONFIG,
  STARTER_HERO_ID,
  AWAKEN_CONFIG,
  HERO_TALENTS
} from '../configs/loaders/entities.loader';
export { HERO_CLASS_LABELS, HERO_CLASS_COLORS, HERO_FACTION_LABELS } from '../configs/constants/heroDisplay';
