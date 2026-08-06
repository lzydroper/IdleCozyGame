// 道具（可主动使用）：食物、药剂、可部署装置等（ADR-0014 分类语义）。
import {
  Cross, CupSoda, FlaskConical, Lamp, Orbit, Package, PackageOpen, Pill,
  Soup, Syringe, Zap,
} from 'lucide-react';
import type { ItemMeta } from './types';

export const PROPS_ITEMS: Record<string, ItemMeta> = {
  ration: { id: 'ration', name: '压缩口粮', description: '高热量压缩食物', category: 'item', sprite: { sheet: 'supplies', index: 0 }, icon: Package, useEffect: { stats: { food: 30 } } },
  hot_stew: { id: 'hot_stew', name: '魔能熔岩热烩', description: '大范围恢复饱食度的魔力食物。', category: 'item', sprite: { sheet: 'supplies', index: 6 }, icon: Soup, useEffect: { stats: { food: 60 } } },
  ration_deluxe: { id: 'ration_deluxe', name: '高级生存罐头', description: '印有红色爱心徽标和铁皮密封扣的废土罐头', category: 'item', sprite: { sheet: 'supplies', index: 10 }, icon: PackageOpen, useEffect: { stats: { food: 45 } } },
  energy_refill: { id: 'energy_refill', name: '能量补充剂', description: '恢复魔能的补充剂', category: 'item', sprite: { sheet: 'supplies', index: 1 }, icon: Zap, useEffect: { stats: { energy: 30 } } },
  stimpack: { id: 'stimpack', name: '废土肾上腺素', description: '橙色瞬时急救药剂针管，激发魔能的极限求生药剂', category: 'item', sprite: { sheet: 'supplies', index: 11 }, icon: Cross, useEffect: { stats: { energy: 15 } } },
  canteen: { id: 'canteen', name: '军用水壶', description: '带迷彩保温护套和电子屏显示的科技感军用大水壶', category: 'item', sprite: { sheet: 'supplies', index: 13 }, icon: CupSoda, useEffect: { stats: { food: 15 } } },
  sanity_capsule: { id: 'sanity_capsule', name: '稳定胶囊', description: '维持精神稳定的胶囊药物', category: 'item', sprite: { sheet: 'supplies', index: 3 }, icon: Pill, useEffect: { capsuleCharge: { sanity_capsule: 1 } } },
  warp_capsule: { id: 'warp_capsule', name: '跃迁胶囊', description: '梦境中的传送工具', category: 'item', sprite: { sheet: 'supplies', index: 4 }, icon: Orbit, useEffect: { capsuleCharge: { warp_capsule: 1 } } },
  nanite_injector: { id: 'nanite_injector', name: '纳米修复注射针', description: '纳米修复剂：治愈战斗中重伤的英雄（在英雄面板使用）。', category: 'item', sprite: { sheet: 'supplies', index: 7 }, icon: Syringe },
  purifying_serum: { id: 'purifying_serum', name: '心灵净化血清', description: '清除大量心灵污染度，稳定理智的净化血清。', category: 'item', sprite: { sheet: 'supplies', index: 8 }, icon: FlaskConical, useEffect: { stats: { sanity: 30 }, pollution: -30 } },
  dream_lantern: { id: 'dream_lantern', name: '引梦魔灯', description: '散发深蓝色星光光晕、带有魔导浮雕的复古手提挂灯', category: 'item', sprite: { sheet: 'supplies', index: 15 }, icon: Lamp, useEffect: { stats: { sanity: 10 } } },
};
