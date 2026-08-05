// 碎片（英雄碎片与觉醒素材）：奥术星体、共鸣碎片、英雄专属灵魂碎片。
import {
  FlaskConical, Footprints, Hammer, HandMetal, HeartPulse, Rocket, Shield, Sparkle,
  Sparkles, Wheat, Wrench,
} from 'lucide-react';
import type { ItemMeta } from './types';

// 英雄专属灵魂碎片：shard_<heroId>，图标复用对应英雄的 Lucide 图标（便于识别归属）

export const SHARD_ITEMS: Record<string, ItemMeta> = {
  arcane_orb: { id: 'arcane_orb', name: '奥术星体', description: '蕴含星界奥术之力的天体核心，满星英雄觉醒的终局素材（仅辐射车间 BOSS 掉落）。', category: 'shard', icon: Sparkle },
  resonance_shard: { id: 'resonance_shard', name: '共鸣碎片', description: '通用灵魂碎片，可用于任意英雄的升星', category: 'shard', icon: Sparkles },
  shard_nova: { id: 'shard_nova', name: '诺娃灵魂碎片', description: '诺娃的专属碎片，用于升星', category: 'shard', icon: Rocket },
  shard_buster: { id: 'shard_buster', name: '巴斯特灵魂碎片', description: '巴斯特的专属碎片，用于升星', category: 'shard', icon: HandMetal },
  shard_soldier: { id: 'shard_soldier', name: '铁卫灵魂碎片', description: '铁卫的专属碎片，用于升星', category: 'shard', icon: Shield },
  shard_catherine: { id: 'shard_catherine', name: '凯瑟琳灵魂碎片', description: '凯瑟琳的专属碎片，用于升星', category: 'shard', icon: HeartPulse },
  shard_roy: { id: 'shard_roy', name: '罗伊灵魂碎片', description: '罗伊的专属碎片，用于升星', category: 'shard', icon: Wrench },
  shard_mei: { id: 'shard_mei', name: '阿梅灵魂碎片', description: '阿梅的专属碎片，用于升星', category: 'shard', icon: Wheat },
  shard_zero: { id: 'shard_zero', name: '赛罗灵魂碎片', description: '赛罗的专属碎片，用于升星', category: 'shard', icon: Footprints },
  shard_healer: { id: 'shard_healer', name: '艾拉灵魂碎片', description: '艾拉的专属碎片，用于升星', category: 'shard', icon: FlaskConical },
  shard_apprentice: { id: 'shard_apprentice', name: '小米灵魂碎片', description: '小米的专属碎片，用于升星', category: 'shard', icon: Hammer },
};
