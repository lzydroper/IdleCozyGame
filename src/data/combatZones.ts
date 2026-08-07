// 战斗区域配置（ticket 05）：线性递进的自动战斗场所；区域链与 BOSS 见 ticket 07
export interface CombatEnemyConfig {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
}

export interface CombatDropConfig {
  itemId: string;
  chance: number;      // 0-1 掉落概率
  minQty: number;
  maxQty: number;
}

// 关底 BOSS 配置（ticket 07）：每区一个，击败后通关区域、解锁下一区；复用同一战斗场景
export interface CombatZoneBossConfig {
  name: string;
  enemies: CombatEnemyConfig[];   // BOSS 战敌人组（含护卫）
  staminaCost: number;            // BOSS 战体力消耗
  expReward: number;              // BOSS 战胜利每位英雄经验
  drops: CombatDropConfig[];      // BOSS 专属掉落（含最强系列装备占位，ticket 10 落地）
  soulEchoMin: number;            // BOSS 战胜利灵魂残响范围
  soulEchoMax: number;
}

export interface CombatZoneConfig {
  id: string;
  name: string;
  description: string;
  recommendedLevel: number;   // 推荐队伍平均等级（同时决定线性链顺序）
  staminaCost: number;        // 每场战斗消耗的体力
  expReward: number;          // 胜利后每位上阵英雄获得的经验
  enemies: CombatEnemyConfig[];   // 一场战斗遭遇的全部敌人
  drops: CombatDropConfig[];      // 胜利掉落表（材料）
  soulEchoMin: number;            // 胜利灵魂残响掉落范围
  soulEchoMax: number;
  boss: CombatZoneBossConfig;     // 关底 BOSS：击败 = 通关本区，解锁下一区
  isTestZone?: boolean;           // 测试专用区域标记（不进入主线线性递进链）
}

export type CombatZonesMap = Record<string, CombatZoneConfig>;

export const COMBAT_ZONES: CombatZonesMap = {
  equipment_test_zone: {
    id: 'equipment_test_zone',
    name: '军备测试场 (测试专用)',

    description: '【测试专享区域】战斗胜利后 100% 掉落废土、余烬、幽梦、星核全套装备及大量强化魔晶，方便全方位测试装备系统。',
    recommendedLevel: 99,
    staminaCost: 0,
    expReward: 50,
    isTestZone: true,
    enemies: [
      { id: 'test_dummy', name: '测试靶机', hp: 10, attack: 1, defense: 0 }
    ],
    drops: [
      { itemId: 'wasteland_weapon', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'wasteland_armor', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'wasteland_trinket', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'dreamveil_weapon', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'dreamveil_armor', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'dreamveil_trinket', chance: 1.0, minQty: 1, maxQty: 1 },
      { itemId: 'enhance_stone', chance: 1.0, minQty: 30, maxQty: 50 },
      { itemId: 'blueprint_ember_armory', chance: 1.0, minQty: 1, maxQty: 1 }
    ],
    soulEchoMin: 20,
    soulEchoMax: 50,
    boss: {
      name: '测试领主',

      enemies: [
        { id: 'test_boss', name: '测试领主', hp: 20, attack: 2, defense: 0 }
      ],
      staminaCost: 10,
      expReward: 100,
      drops: [
        { itemId: 'ember_weapon', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'ember_armor', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'ember_trinket', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'starcore_weapon', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'starcore_armor', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'starcore_trinket', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'arcane_orb', chance: 1.0, minQty: 1, maxQty: 1 },
        { itemId: 'enhance_stone', chance: 1.0, minQty: 100, maxQty: 100 }
      ],
      soulEchoMin: 50,
      soulEchoMax: 100
    }
  },
  wasteland_entrance: {
    id: 'wasteland_entrance',
    name: '废土边缘',

    description: '避难所大门外的第一片废土，游荡着饥饿的变异鬣狗与鼠群，是检验小队战力的最佳训练场。',
    recommendedLevel: 1,
    staminaCost: 10,
    expReward: 20,
    enemies: [
      { id: 'wasteland_hound', name: '废土鬣狗', hp: 45, attack: 9, defense: 3 },
      { id: 'mutant_rat', name: '变异鼠群', hp: 30, attack: 7, defense: 1 }
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'glow_fiber', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'enhance_stone', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'exp_tome', chance: 0.35, minQty: 1, maxQty: 1 }
    ],
    soulEchoMin: 2,
    soulEchoMax: 4,
    boss: {
      name: '废土鬣狗王',

      enemies: [
        { id: 'wasteland_hound_king', name: '废土鬣狗王', hp: 90, attack: 13, defense: 5 }
      ],
      staminaCost: 12,
      expReward: 30,
      drops: [
        { itemId: 'scrap_metal', chance: 0.8, minQty: 2, maxQty: 4 },
        { itemId: 'glow_fiber', chance: 0.5, minQty: 1, maxQty: 3 },
        { itemId: 'mana_dust', chance: 0.3, minQty: 1, maxQty: 2 },
        { itemId: 'enhance_stone', chance: 0.7, minQty: 1, maxQty: 3 },
        { itemId: 'exp_tome', chance: 0.6, minQty: 1, maxQty: 2 }
      ],
      soulEchoMin: 5,
      soulEchoMax: 8
    }
  },
  old_town_ruins: {
    id: 'old_town_ruins',
    name: '旧城废墟',

    description: '残破的旧城街区盘踞着拾荒匪徒与变异生物，废墟深处埋藏着可用的合金与魔能材料。',
    recommendedLevel: 3,
    staminaCost: 15,
    expReward: 35,
    enemies: [
      { id: 'ruin_scavenger', name: '废墟拾荒者', hp: 80, attack: 16, defense: 4 },
      { id: 'mutant_rat', name: '变异鼠群', hp: 35, attack: 8, defense: 1 }
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 3 },
      { itemId: 'alloy_plate', chance: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'mana_dust', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'enhance_stone', chance: 0.6, minQty: 1, maxQty: 3 },
      { itemId: 'exp_tome', chance: 0.35, minQty: 1, maxQty: 1 }
    ],
    soulEchoMin: 4,
    soulEchoMax: 7,
    boss: {
      name: '废墟霸主',

      enemies: [
        { id: 'ruin_overlord', name: '废墟霸主', hp: 150, attack: 20, defense: 8 },
        { id: 'mutant_rat', name: '变异鼠群', hp: 35, attack: 8, defense: 1 }
      ],
      staminaCost: 18,
      expReward: 50,
      drops: [
        { itemId: 'alloy_plate', chance: 0.6, minQty: 1, maxQty: 2 },
        { itemId: 'ember_weapon', chance: 0.15, minQty: 1, maxQty: 1 },
        { itemId: 'ember_armor', chance: 0.1, minQty: 1, maxQty: 1 },
        { itemId: 'ember_trinket', chance: 0.1, minQty: 1, maxQty: 1 },
        { itemId: 'blueprint_ember_armory', chance: 0.25, minQty: 1, maxQty: 1 },
        { itemId: 'enhance_stone', chance: 0.8, minQty: 2, maxQty: 4 },
        { itemId: 'exp_tome', chance: 0.6, minQty: 1, maxQty: 2 }
      ],
      soulEchoMin: 10,
      soulEchoMax: 15
    }
  },
  radiated_workshop: {
    id: 'radiated_workshop',
    name: '辐射车间',

    description: '被辐射侵蚀的自动化车间，失控机器与畸变实验体在浓雾中游荡，产出高价值合金与等离子材料。',
    recommendedLevel: 6,
    staminaCost: 20,
    expReward: 60,
    enemies: [
      { id: 'radiation_mutant', name: '辐射变异体', hp: 130, attack: 20, defense: 6 },
      { id: 'rogue_machine', name: '失控机器仆从', hp: 90, attack: 15, defense: 8 },
      { id: 'aberrant_subject', name: '畸变实验体', hp: 70, attack: 18, defense: 5 }
    ],
    drops: [
      { itemId: 'alloy_plate', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'rusted_spring', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'plasma_cell', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'nanite_slurry', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'enhance_stone', chance: 0.7, minQty: 2, maxQty: 4 },
      { itemId: 'exp_tome', chance: 0.35, minQty: 1, maxQty: 1 }
    ],
    soulEchoMin: 8,
    soulEchoMax: 12,
    boss: {
      name: '车间之主·畸变聚合体',

      enemies: [
        { id: 'workshop_abomination', name: '车间之主·畸变聚合体', hp: 260, attack: 26, defense: 10 },
        { id: 'rogue_machine', name: '失控机器仆从', hp: 90, attack: 15, defense: 8 }
      ],
      staminaCost: 25,
      expReward: 80,
      drops: [
        { itemId: 'plasma_cell', chance: 0.5, minQty: 1, maxQty: 2 },
        { itemId: 'nanite_slurry', chance: 0.4, minQty: 1, maxQty: 2 },
        { itemId: 'starcore_weapon', chance: 0.15, minQty: 1, maxQty: 1 },
        { itemId: 'starcore_armor', chance: 0.1, minQty: 1, maxQty: 1 },
        { itemId: 'starcore_trinket', chance: 0.1, minQty: 1, maxQty: 1 },
        { itemId: 'arcane_orb', chance: 0.12, minQty: 1, maxQty: 1 },
        { itemId: 'enhance_stone', chance: 0.9, minQty: 3, maxQty: 5 },
        { itemId: 'exp_tome', chance: 0.6, minQty: 1, maxQty: 2 }
      ],
      soulEchoMin: 18,
      soulEchoMax: 25
    }
  }
};

// 按推荐等级升序排列的区域列表（UI 与线性链共用）
export const COMBAT_ZONE_LIST: CombatZoneConfig[] = Object.values(COMBAT_ZONES)
  .sort((a, b) => a.recommendedLevel - b.recommendedLevel);

export const ALL_COMBAT_ZONES = COMBAT_ZONE_LIST;
