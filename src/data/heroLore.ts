// 英雄档案设定文案（10 号：档案详情页展示用）—— 职阶/阵营的设定说明与阵营标签配色。
// 世界观参考 ADR-0002 与 heroes.ts 各英雄 backstory；文案为数据配置，UI 直接展示，可随时调整。
import type { HeroClass, HeroFaction } from '../types/game';

// 职阶设定说明
export const HERO_CLASS_LORE: Record<HeroClass, string> = {
  guardian:
    '队伍的前排壁垒，以高生命与防御换取阵地控制力——废土上的移动城墙，擅长防御部署与阵地战，吸引火力、保护队友。',
  attacker:
    '队伍的矛头，高攻击输出，面对机械兽潮与梦魇实体冲锋在前，用火力撕开防线。',
  conductor:
    '队伍的枢纽，攻守均衡、属性全面，擅长以共鸣与协作放大团队整体战力，是团队构筑的黏合剂。'
};

// 阵营设定说明
export const HERO_FACTION_LORE: Record<HeroFaction, string> = {
  arcane: '掌握古老魔导秘法的施法者传统，力量源于废土之下残存的奥术回路与星象共鸣。',
  mechanical: '依赖魔导机械与工业技术的派系，相信用钢铁与齿轮重建文明。',
  nightmare: '受梦魇侵蚀影响、游走于现实与梦境边界的派系，力量来自与黑暗的共处。',
  spirit: '继承旧文明英烈意志的守护者，力量源于信念与传承。',
  astral: '以星象与虚空为指引的旅者，力量来自天外的星界能量。',
  soulseal: '以灵魂印记与契约之力驱动的秘术派系，力量源于生命本身的印记。'
};

// 阵营标签配色（仿 HERO_CLASS_COLORS 格式）
export const HERO_FACTION_COLORS: Record<HeroFaction, string> = {
  arcane: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
  mechanical: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
  nightmare: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-950/40',
  spirit: 'text-sky-400 border-sky-500/40 bg-sky-950/40',
  astral: 'text-violet-400 border-violet-500/40 bg-violet-950/40',
  soulseal: 'text-rose-400 border-rose-500/40 bg-rose-950/40'
};
