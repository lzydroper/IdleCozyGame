/**
 * 幸存者档案（ADR-0013：幸存者=英雄的剧情别称；config-json-migration 批次③ 归位）：
 * 数据本体 data/entities/survivors.json——本文件仅转发兼容存量引用（批次④收口删除）。
 */
export interface SurvivorConfig {
  id: string;
  name: string;
  role: 'farmer' | 'engineer' | 'scout' | 'guard' | 'chemist' | 'scavenger';
  /** 角色中文职位名，供 UI 直接显示（避免重复 ternary 硬编码） */
  roleLabel: string;
  backstory: string;
  dreamTrigger: string;
  realityLocationId: string;
}

export { SURVIVORS_CONFIG } from '../configs/loaders/entities.loader';
