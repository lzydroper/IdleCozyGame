/**
 * events 域装配（config-json-migration 批次② 2.4）。
 * reality 按 type 分文件（reality_common/danger/combat/…），glob 归并——新增类别文件零代码改动。
 */
import dreamJson from '../../data/events/dreamEvents.json';
import rescueEventsJson from '../../data/events/rescueEvents.json';
import rescueLocationsJson from '../../data/events/rescueLocations.json';
import orderJson from '../../data/events/realityOrder.json';
import { devGuardTable } from './devGuard';

type RealityTable = Record<string, { type?: string } & Record<string, unknown>>;

const realityModules = import.meta.glob('../../data/events/reality_*.json', {
  eager: true
}) as Record<string, { default: RealityTable }>;

// 归并后按 reality_order.json（原单文件 authored 顺序）重排——
// 保证「路径透明」：分文件重组不改变事件池枚举序，确定性 rng 测试与加权挑选行为不变。
const merged: RealityTable = Object.fromEntries(
  Object.entries(realityModules).flatMap(([, mod]) => Object.entries(mod.default))
);
const ordered: RealityTable = {};
for (const id of orderJson as string[]) {
  if (id in merged) ordered[id] = merged[id];
}
for (const [id, evt] of Object.entries(merged)) {
  if (!(id in ordered)) ordered[id] = evt;
}

export const REALITY_EVENTS = ordered as unknown as Record<string, RealityEvent>;

// 形状沿用 data/dreamEvents.ts 的既有接口。
import type { DreamEvent } from '../../data/dreamEvents';

export const DREAM_EVENTS = devGuardTable(
  'events/dream',
  dreamJson as unknown as Record<string, DreamEvent>,
  { required: ['type'] }
);

// 形状沿用 data/realityEvents.ts 的既有接口（类型仅引用，运行时零循环）。
import type { RealityEvent } from '../../data/realityEvents';

export const RESCUE_EVENTS = rescueEventsJson as unknown as Record<string, RealityEvent>;

export const RESCUE_LOCATION_NAMES = (rescueLocationsJson as { names: Record<string, { displayName: string; shortName?: string }> })
  .names;
export const RESCUE_LOCATION_MAP = (rescueLocationsJson as { eventToLocation: Record<string, string> })
  .eventToLocation;
