/**
 * equipment 装备域装配（config-json-migration 批次④ 收口）：
 * 系列套装与装备静态表 json 化（data/equipment/*.json），
 * 类型真相收口 configs/types/equipment.types；
 * 数值常量（ENHANCE_MAX/FORGE_COST 等）在 configs/constants/equipmentConstants。
 */
import equipmentJson from '../../data/equipment/equipment.json';
import equipmentSetsJson from '../../data/equipment/equipmentSets.json';
import type { EquipmentConfig, EquipmentSetConfig } from '../types/equipment.types';
import { devGuardKeyed } from './devGuard';

// 套装被动守卫（heroes-skills spec §1.4）：一套至多一条；引用注册表与内联本体二选一；
// 内联本体必须 activation==='passive'。仅 DEV 执行。
const guardSetPassives = (sets: Record<string, EquipmentSetConfig>): Record<string, EquipmentSetConfig> => {
  if (!import.meta.env.DEV) return sets;
  for (const [setId, set] of Object.entries(sets)) {
    const defs = set.passiveSkills ?? [];
    if (defs.length > 1) {
      throw new Error(`[configs:equipment/equipmentSets] '${setId}' 的 passiveSkills 至多一条，实际 ${defs.length}`);
    }
    for (const def of defs) {
      if (!def.id || typeof def.id !== 'string') {
        throw new Error(`[configs:equipment/equipmentSets] '${setId}' 套装被动缺少非空 id`);
      }
      if (!!def.abilityId === !!def.ability) {
        throw new Error(`[configs:equipment/equipmentSets] '${setId}' 套装被动 '${def.id}' 必须且只能提供 abilityId 或 ability 之一`);
      }
      const body = def.ability;
      if (body && body.activation !== 'passive') {
        throw new Error(`[configs:equipment/equipmentSets] '${setId}' 套装被动 '${def.id}' 内联本体必须为 passive`);
      }
      if (typeof def.enhanceGrowth !== 'undefined' && (typeof def.enhanceGrowth !== 'number' || !Number.isFinite(def.enhanceGrowth) || def.enhanceGrowth < 0)) {
        throw new Error(`[configs:equipment/equipmentSets] '${setId}' 套装被动 '${def.id}' enhanceGrowth 必须是非负有限数`);
      }
    }
  }
  return sets;
};

export const EQUIPMENT_SETS: Record<string, EquipmentSetConfig> = guardSetPassives(
  Object.fromEntries(
    devGuardKeyed(
      'equipment/equipmentSets',
      equipmentSetsJson as unknown as Record<string, EquipmentSetConfig> | EquipmentSetConfig[]
    )
  )
);

export const EQUIPMENT_CONFIG: Record<string, EquipmentConfig> = Object.fromEntries(
  devGuardKeyed(
    'equipment/equipment',
    equipmentJson as unknown as Record<string, EquipmentConfig> | EquipmentConfig[]
  )
);

/** 装备列表（UI 遍历用） */
export const EQUIPMENT_LIST: EquipmentConfig[] = Object.values(EQUIPMENT_CONFIG);
