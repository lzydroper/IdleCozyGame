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

// 数据本体已迁 data/events/dreamEvents.json（config-json-migration 批次②）。
export { DREAM_EVENTS } from '../configs/loaders/event.loader';