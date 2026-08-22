import { describe, it, expect } from 'vitest';
import type { BattleEvent } from './turnEngine';
import {
  formatBattleEvent,
  registerBattleEventPresenter,
  unregisterBattleEventPresenter,
  getBattleEventPresenter
} from './battleEventPresentation';

const event = (overrides: Partial<BattleEvent> = {}): BattleEvent => ({
  seq: 0,
  round: 1,
  key: 'attackAfter',
  unitId: 'nova',
  sourceId: 'nova',
  targetId: 'wasteland_hound',
  unitName: '诺娃',
  sourceName: '诺娃',
  targetName: '废土鬣狗',
  data: { kind: 'attack', damage: 45 },
  ...overrides
});

describe('battleEventPresentation（事件展示注册表）', () => {
  it('内置标准键可渲染为一行展示文本（优先使用名称而非 id）', () => {
    expect(formatBattleEvent(event())).toBe('【诺娃】→【废土鬣狗】攻击 -45');
    expect(formatBattleEvent(event({ key: 'death', unitId: 'wasteland_hound', unitName: '废土鬣狗' }))).toBe('【废土鬣狗】阵亡');
    expect(formatBattleEvent(event({ key: 'roundStart', unitId: null, unitName: null }))).toBe('第 1 轮开始');
    expect(formatBattleEvent(event({ key: 'abilityUsed', data: { abilityId: 'basic_attack' } }))).toBe('【诺娃】→【废土鬣狗】使用【普通攻击】');
    expect(formatBattleEvent(event({ key: 'abilityUsed', data: { abilityId: 'awaken_nova', abilityName: '电涌过载' } }))).toBe('【诺娃】→【废土鬣狗】使用【电涌过载】');
  });

  it('新事件键可注册 presenter，注册后 UI 消费端无需改动', () => {
    const key = 'poisonTick';
    registerBattleEventPresenter({
      key,
      format: e => `【${e.targetName ?? e.targetId ?? ''}】中毒 -${String(e.data.amount ?? 0)}`
    });
    expect(getBattleEventPresenter(key)).toBeDefined();
    expect(formatBattleEvent(event({ key, targetId: 'nova', targetName: '诺娃', data: { amount: 6 } }))).toBe('【诺娃】中毒 -6');
    unregisterBattleEventPresenter(key);
  });

  it('未知事件键回退为结构化字段，不白屏', () => {
    const text = formatBattleEvent(event({ key: 'futureEvent', data: { x: 1 } }));
    expect(text).toContain('futureEvent');
    expect(text).toContain('诺娃');
  });

  it('unregister 后回退到兜底渲染', () => {
    const key = 'temporaryEvent';
    registerBattleEventPresenter({ key, format: () => '临时事件' });
    expect(formatBattleEvent(event({ key }))).toBe('临时事件');
    unregisterBattleEventPresenter(key);
    expect(getBattleEventPresenter(key)).toBeUndefined();
    expect(formatBattleEvent(event({ key }))).toContain('temporaryEvent');
  });
});
