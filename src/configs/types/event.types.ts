/**
 * events 域类型（config-json-migration 批次④ 收口）。
 */
import type { DropEntry } from './region.types';

// === 梦境事件 ===

export type DreamEventType = 'welfare' | 'common' | 'danger' | 'signal';

export interface DreamChoice {
  text: string;
  results: {
    stats?: {
      sanity?: number;
      pollution?: number;
      resonance?: number; // 针对英雄共鸣增加值
    };
    items?: Record<string, number>;
    logText: string;
    targetHeroId?: string; // 如果是特定英雄共鸣
  };
}

export interface DreamEvent {
  id: string;
  title: string;
  description: string;
  type: DreamEventType;
  choices: {
    A: DreamChoice;
    B: DreamChoice;
  };
  weight?: number; // 出现权重，不填默认为 100
}

// === 现实探索事件 ===

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
