import type { DropEntry } from './regions';

export type RealityEventType = 'common' | 'danger' | 'combat' | 'welfare' | 'relic' | 'anomaly' | 'encounter';

export interface EventChoice {
  text: string;
  requirements?: Record<string, number>;
  results: {
    stats?: {
      food?: number;
      energy?: number;
      sanity?: number;
    };
    items?: Record<string, number>;
    logText: string;
  };
}

// 战斗遭遇配置（ticket 06）：事件进入与自动战斗同一战斗场景
export interface EncounterBattleConfig {
  enemies: string[];                // 遭遇的敌人 id 组（查 ENEMY_CONFIGS）
  expReward: number;                 // 胜利后每位上阵英雄获得的经验
  drops: DropEntry[];               // 胜利后掉入探索临时背囊
}

export interface RealityEvent {
  id: string;
  title: string;
  description: string;
  type: RealityEventType;
  choices?: {
    A: EventChoice;
    B: EventChoice;
  };
  battle?: EncounterBattleConfig; // 战斗遭遇事件：触发后进入战斗场景而非选择卡
  weight?: number; // 出现权重，不填默认为 100
}

// 数据本体已迁 data/events/reality_*.json 按 type 分文件（config-json-migration 批次②）；
// 权重常量归位 configs/constants/eventWeights.ts。
export { REALITY_EVENTS } from '../configs/loaders/event.loader';
export { CATEGORY_WEIGHTS } from '../configs/constants/eventWeights';