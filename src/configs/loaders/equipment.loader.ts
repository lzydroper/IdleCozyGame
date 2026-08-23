/**
 * equipment 装备域装配（config-json-migration 批次④ 收口）：
 * 系列套装与装备静态表 json 化（data/equipment/*.json），
 * 类型真相收口 configs/types/equipment.types；
 * 数值常量（ENHANCE_MAX/FORGE_COST 等）在 configs/constants/equipmentConstants。
 */
import equipmentJson from '../../data/equipment/equipment.json';
import equipmentSetsJson from '../../data/equipment/equipmentSets.json';
import type { EquipmentConfig, EquipmentSetConfig } from '../types/equipment.types';
import { devGuardTable } from './devGuard';

export const EQUIPMENT_SETS = devGuardTable(
  'equipment/equipmentSets',
  equipmentSetsJson as unknown as Record<string, EquipmentSetConfig>
);

export const EQUIPMENT_CONFIG = devGuardTable(
  'equipment/equipment',
  equipmentJson as unknown as Record<string, EquipmentConfig>
);

/** 装备列表（UI 遍历用） */
export const EQUIPMENT_LIST: EquipmentConfig[] = Object.values(EQUIPMENT_CONFIG);
