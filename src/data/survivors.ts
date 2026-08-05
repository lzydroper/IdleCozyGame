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

export const SURVIVORS_CONFIG: SurvivorConfig[] = [
  {
    id: 'roy',
    name: '罗伊',
    role: 'engineer',
    roleLabel: '工程师',

    backstory: '前废土矿山工程师，擅长修理各种机械设备。',
    dreamTrigger: '在梦境的机械废墟中，你听到了工具碰撞金属的声音...',
    realityLocationId: 'radar_station'
  },
  {
    id: 'mei',
    name: '阿梅',
    role: 'farmer',
    roleLabel: '农学家',

    backstory: '曾经在辐射区种植食物的农学家，对各种变异植物了如指掌。',
    dreamTrigger: '在梦境的荧光花海中，有人在轻声哼歌...',
    realityLocationId: 'green_ruins'
  },
  {
    id: 'zero',
    name: '赛罗',
    role: 'scout',
    roleLabel: '侦察兵',

    backstory: '废土信使，熟悉所有地形和危险区域。',
    dreamTrigger: '在梦境的迷宫中，一道快速移动的身影在前方引路...',
    realityLocationId: 'signal_tower'
  },
  {
    id: 'catherine',
    name: '凯瑟琳',
    role: 'farmer',
    roleLabel: '农学家',

    backstory: '前辐射防治所的主任，专注于利用变异植物研发广谱抗辐射净化血清。',
    dreamTrigger: '在梦境深处，你隐约闻到了一股散发着消毒水味的气息，以及微弱的手术刀碰撞声...',
    realityLocationId: 'bio_lab'
  },
  {
    id: 'buster',
    name: '巴斯特',
    role: 'scout',
    roleLabel: '侦察兵',

    backstory: '在废土中行走了二十年的清道夫硬汉，拥有一双能从垃圾堆里淘出核心部件的巧手。',
    dreamTrigger: '在一阵极其嘈杂的心灵电波中，你听到了伴随金属电吉他嘶吼的粗犷歌声...',
    realityLocationId: 'collapsed_subway'
  },
  {
    id: 'nova',
    name: '诺娃',
    role: 'engineer',
    roleLabel: '工程师',

    backstory: '前联合防卫军魔导机甲的备用驾驶员，性格豪爽，擅长让各种魔导设施过载运转。',
    dreamTrigger: '在梦境的钢铁废墟上空，一道刺眼的橙色强光伴随着机甲过载警报声不断闪烁...',
    realityLocationId: 'military_depot'
  },

  // === 新幸存者 ===
  {
    id: 'soldier',
    name: '铁卫',
    role: 'guard',
    roleLabel: '卫兵',

    backstory: '避难所防御队长，曾负责废土前哨站的安保工作，擅长防御部署与阵地战。',
    dreamTrigger: '在梦境的钢铁堡垒废墟中，你听到了沉重的金属脚步声和盾牌撞击地面的回响...',
    realityLocationId: 'radar_station'
  },
  {
    id: 'healer',
    name: '艾拉',
    role: 'chemist',
    roleLabel: '药剂师',

    backstory: '前避难所联合制药厂的药剂配方师，精通各种净化药剂的调配与改良。',
    dreamTrigger: '在梦境的药草园实验室中，你闻到了熟悉的消毒水和草药混合的气味...',
    realityLocationId: 'bio_lab'
  },
  {
    id: 'apprentice',
    name: '小米',
    role: 'scavenger',
    roleLabel: '拾荒者',

    backstory: '在废土中长大的拾荒学徒，虽然年纪不大但已经在垃圾堆里摸爬滚打了许多年。',
    dreamTrigger: '在梦境的霓虹垃圾场中，你听到了小女孩哼着不成调的废土歌谣...',
    realityLocationId: 'collapsed_subway'
  }
];
