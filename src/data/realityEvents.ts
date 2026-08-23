// 现实探索事件（config-json-migration 批次② 归位）：
// 数据本体 data/events/reality_*.json 按 type 分文件，类型真相收口 configs/types/event.types，
// 权重常量归位 configs/constants/eventWeights——本文件仅转发兼容存量引用（批次④收口删除）。
export { REALITY_EVENTS } from '../configs/loaders/event.loader';
export { CATEGORY_WEIGHTS } from '../configs/constants/eventWeights';
export type {
  RealityEventType,
  EventChoice,
  EncounterBattleConfig,
  RealityEvent
} from '../configs/types/event.types';
