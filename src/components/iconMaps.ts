// 图标映射表（零 Emoji 规范）：全站物品/英雄/敌人/区域/装备槽位的 Lucide React SVG 图标。
// 独立文件以符合 react/only-export-components（Fast Refresh 只允许组件文件导出组件）。
// 雪碧图缺失的 id 在 GameIcon 中以此映射渲染「待补 sprite」标记，后续补充雪碧图后自动切换。
import type { LucideIcon } from 'lucide-react';
import {
  Apple, BatteryCharging, BatteryFull, Bot, Bug, Building2, CircleDot, Cog, Cross, Crown,
  CupSoda, Diamond, Dna, Dog, Factory, FlaskConical, Flame, Flower2, Footprints, Gem,
  Ghost, Hammer, HandMetal, HeartPulse, Lamp, Layers, Leaf, Mouse, MoonStar,
  Mountain, Orbit, Package, PackageOpen, Pill, Radar, Radiation, Rocket, ScanSearch,
  ScrollText, Shield, Skull, Snowflake, Soup, Sparkle, Sparkles, Sprout, Sword, Syringe,
  Target, TowerControl, Wheat, Wrench, Zap,
} from 'lucide-react';
import type { EquipmentSlot } from '../types/game';

// 完整 Lucide React SVG 图标映射：每个物品/英雄 id 都有对应 Lucide 图标
export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // === 物品（items.ts 全量） ===
  glow_fiber: Leaf,
  mana_dust: Sparkles,
  aether_pulp: Apple,
  dream_shard: Gem,
  steel_petal: Flower2,
  alloy_plate: Layers,
  ration: Package,
  scrap_metal: Wrench,
  seed_glow_grass: Sprout,
  seed_aether_berry: Sprout,
  seed_steel_sunflower: Sprout,
  energy_refill: Zap,
  defensive_turret: TowerControl,
  sanity_capsule: Pill,
  warp_capsule: Orbit,
  seed_magma_pepper: Sprout,
  seed_frost_bell: Sprout,
  seed_plasma_pumpkin: Sprout,
  seed_void_lotus: Sprout,
  magma_core: Flame,
  frost_crystal: Snowflake,
  plasma_cell: BatteryCharging,
  void_essence: MoonStar,
  hot_stew: Soup,
  nanite_injector: Syringe,
  purifying_serum: FlaskConical,
  shield_battery: BatteryFull,
  seed_echo_shroom: Sprout,
  seed_magnetic_clover: Sprout,
  seed_solar_cactus: Sprout,
  seed_stellar_rose: Sprout,
  seed_nebula_moss: Sprout,
  seed_storm_sprout: Sprout,
  seed_crystal_reed: Sprout,
  seed_shadow_fern: Sprout,
  seed_chrono_vine: Sprout,
  aether_ingot: Layers,
  crystal_silicon: Sparkles,
  nanite_slurry: FlaskConical,
  nightmare_tear: CircleDot,
  rusted_spring: Cog,
  plasma_arc: Zap,
  ration_deluxe: PackageOpen,
  stimpack: Cross,
  geiger_counter: Radar,
  canteen: CupSoda,
  deflective_lens: ScanSearch,
  dream_lantern: Lamp,
  void_core: Orbit,
  enhance_stone: Diamond,
  blueprint_ember_armory: ScrollText,
  arcane_orb: Sparkle,
  wasteland_weapon: Sword,
  wasteland_armor: Shield,
  wasteland_trinket: Gem,
  dreamveil_weapon: Sword,
  dreamveil_armor: Shield,
  dreamveil_trinket: Gem,
  ember_weapon: Sword,
  ember_armor: Shield,
  ember_trinket: Gem,
  starcore_weapon: Sword,
  starcore_armor: Shield,
  starcore_trinket: Gem,
  energy_cell: BatteryCharging,

  // === 英雄/幸存者（heroes.ts 战斗配置 / survivors.ts 剧情档案，全量） ===
  nova: Rocket,
  buster: HandMetal,
  soldier: Shield,
  catherine: HeartPulse,
  roy: Wrench,
  mei: Wheat,
  zero: Footprints,
  healer: FlaskConical,
  apprentice: Hammer,
};

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
