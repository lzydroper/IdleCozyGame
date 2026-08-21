// 非物品图标映射表（零 Emoji 规范）：敌人 / 战斗区域 / 装备槽位的 Lucide React SVG 图标。
// 物品与英雄的 Lucide 回退已内聚到各自的配置表（ITEMS_CONFIG / HEROES_CONFIG，ADR-0015）。
import type { LucideIcon } from 'lucide-react';
import {
  Bot, Bug, Building2, Crown, Dna, Dog, Factory, Gem, Ghost, Mountain, Mouse, Radiation,
  Shield, Skull, Sword, Target, Wrench,
} from 'lucide-react';
import type { EquipmentSlot } from '../types/game';

// 敌人图标映射（敌人无雪碧图，直接渲染 Lucide）
export const ENEMY_ICON_MAP: Record<string, LucideIcon> = {
  test_dummy: Target,
  test_boss: Crown,
  wasteland_hound: Dog,
  wasteland_hound_king: Crown,
  mutant_rat: Mouse,
  ruin_scavenger: Ghost,
  ruin_overlord: Skull,
  radiation_mutant: Radiation,
  rogue_machine: Bot,
  aberrant_subject: Dna,
  workshop_abomination: Bug,
  dream_leak_nightmare: Skull,
};

// 战斗区域图标映射
export const ZONE_ICON_MAP: Record<string, LucideIcon> = {
  equipment_test_zone: Wrench,
  wasteland_entrance: Mountain,
  old_town_ruins: Building2,
  radiated_workshop: Factory,
};

// 装备槽位图标映射（替代原 EQUIPMENT_SLOT_EMOJIS）
export const SLOT_ICON_MAP: Record<EquipmentSlot, LucideIcon> = {
  weapon: Sword,
  armor: Shield,
  trinket: Gem,
};
