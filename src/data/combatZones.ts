// 战斗区域配置（ticket 05）：线性递进的自动战斗场所（区域进阶/BOSS 见 ticket 07）
export interface CombatEnemyConfig {
  id: string;
  name: string;
  emoji: string;
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

export interface CombatZoneConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
  recommendedLevel: number;   // 推荐队伍平均等级
  staminaCost: number;        // 每场战斗消耗的体力
  expReward: number;          // 胜利后每位上阵英雄获得的经验
  enemies: CombatEnemyConfig[];   // 一场战斗遭遇的全部敌人
  drops: CombatDropConfig[];      // 胜利掉落表（材料）
  soulEchoMin: number;            // 胜利灵魂残响掉落范围
  soulEchoMax: number;
}

export type CombatZonesMap = Record<string, CombatZoneConfig>;

export const COMBAT_ZONES: CombatZonesMap = {
  wasteland_entrance: {
    id: 'wasteland_entrance',
    name: '废土边缘',
    emoji: '🏜️',
    description: '避难所大门外的第一片废土，游荡着饥饿的变异鬣狗与鼠群，是检验小队战力的最佳训练场。',
    recommendedLevel: 1,
    staminaCost: 10,
    expReward: 20,
    enemies: [
      { id: 'wasteland_hound', name: '废土鬣狗', emoji: '🐺', hp: 45, attack: 9, defense: 3 },
      { id: 'mutant_rat', name: '变异鼠群', emoji: '🐀', hp: 30, attack: 7, defense: 1 }
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'glow_fiber', chance: 0.4, minQty: 1, maxQty: 2 }
    ],
    soulEchoMin: 2,
    soulEchoMax: 4
  },
  old_town_ruins: {
    id: 'old_town_ruins',
    name: '旧城废墟',
    emoji: '🏚️',
    description: '残破的旧城街区盘踞着拾荒匪徒与变异生物，废墟深处埋藏着可用的合金与魔能材料。',
    recommendedLevel: 3,
    staminaCost: 15,
    expReward: 35,
    enemies: [
      { id: 'ruin_scavenger', name: '废墟拾荒者', emoji: '🧟', hp: 80, attack: 16, defense: 4 },
      { id: 'mutant_rat', name: '变异鼠群', emoji: '🐀', hp: 35, attack: 8, defense: 1 }
    ],
    drops: [
      { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 3 },
      { itemId: 'alloy_plate', chance: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'mana_dust', chance: 0.3, minQty: 1, maxQty: 2 }
    ],
    soulEchoMin: 4,
    soulEchoMax: 7
  },
  radiated_workshop: {
    id: 'radiated_workshop',
    name: '辐射车间',
    emoji: '🏭',
    description: '被辐射侵蚀的自动化车间，失控机器与畸变实验体在浓雾中游荡，产出高价值合金与等离子材料。',
    recommendedLevel: 6,
    staminaCost: 20,
    expReward: 60,
    enemies: [
      { id: 'radiation_mutant', name: '辐射变异体', emoji: '👹', hp: 130, attack: 20, defense: 6 },
      { id: 'rogue_machine', name: '失控机器仆从', emoji: '🤖', hp: 90, attack: 15, defense: 8 },
      { id: 'aberrant_subject', name: '畸变实验体', emoji: '🧬', hp: 70, attack: 18, defense: 5 }
    ],
    drops: [
      { itemId: 'alloy_plate', chance: 0.6, minQty: 1, maxQty: 2 },
      { itemId: 'rusted_spring', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'plasma_cell', chance: 0.25, minQty: 1, maxQty: 1 },
      { itemId: 'nanite_slurry', chance: 0.2, minQty: 1, maxQty: 1 }
    ],
    soulEchoMin: 8,
    soulEchoMax: 12
  }
};

// 按推荐等级升序排列的区域列表（UI 使用）
export const COMBAT_ZONE_LIST: CombatZoneConfig[] = Object.values(COMBAT_ZONES)
  .sort((a, b) => a.recommendedLevel - b.recommendedLevel);
