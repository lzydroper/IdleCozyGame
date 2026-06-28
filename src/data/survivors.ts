export interface SurvivorConfig {
  id: string;
  name: string;
  role: 'farmer' | 'engineer' | 'scout';
  emoji: string;
  backstory: string;          // 背景故事
  dreamTrigger: string;       // 在梦境中联络到他的提示信息
  realityLocationId: string;  // 现实中的救援地点 ID
  bonus: number;              // 提供的效率加成
  bonusDescription: string;   // 加成描述
}

export const SURVIVORS_CONFIG: SurvivorConfig[] = [
  {
    id: 'roy',
    name: '罗伊',
    role: 'engineer',
    emoji: '🔧',
    backstory: '前废土矿山工程师，擅长修理各种机械设备。',
    dreamTrigger: '在梦境的机械废墟中，你听到了工具碰撞金属的声音...',
    realityLocationId: 'radar_station', // 对应雷达站
    bonus: 0.2,
    bonusDescription: '工坊能耗 -20%'
  },
  {
    id: 'mei',
    name: '阿梅',
    role: 'farmer',
    emoji: '🌾',
    backstory: '曾经在辐射区种植食物的农学家，对各种变异植物了如指掌。',
    dreamTrigger: '在梦境的荧光花海中，有人在轻声哼歌...',
    realityLocationId: 'green_ruins', // 对应温室废墟
    bonus: 0.25,
    bonusDescription: '温室作物生长速度 +25%'
  },
  {
    id: 'zero',
    name: 'Zero',
    role: 'scout',
    emoji: '🏃',
    backstory: '废土信使，熟悉所有地形和危险区域。',
    dreamTrigger: '在梦境的迷宫中，一道快速移动的身影在前方引路...',
    realityLocationId: 'signal_tower', // 对应信号塔
    bonus: 0.15,
    bonusDescription: '地表探索消耗 -15%'
  }
];
