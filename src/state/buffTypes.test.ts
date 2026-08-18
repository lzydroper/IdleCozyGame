import { describe, it, expect } from 'vitest';
import { BUFF_CONFIGS, getBuffConfig } from './buffTypes';

describe('Buff 配置注册表', () => {
  it('覆盖灼烧 / 眩晕 / 折焰 / 战意四类样本', () => {
    expect(BUFF_CONFIGS.burn.durationKind).toBe('temporary');
    expect(BUFF_CONFIGS.burn.renew).toBe(true);
    expect(BUFF_CONFIGS.burn.stack).toBe(true);

    expect(BUFF_CONFIGS.stun.durationKind).toBe('temporary');
    expect(BUFF_CONFIGS.stun.stack).toBe(false);

    expect(BUFF_CONFIGS.foldFlame.durationKind).toBe('forever');
    expect(BUFF_CONFIGS.foldFlame.consumeOnTrigger).toBe(true);
    expect(BUFF_CONFIGS.foldFlame.stackIncrement).toBe(5);

    expect(BUFF_CONFIGS.warSpirit.durationKind).toBe('forever');
    expect(BUFF_CONFIGS.warSpirit.renew).toBe(false);
  });

  it('按 buffId 查询，未注册返回 undefined', () => {
    expect(getBuffConfig('burn')).toBe(BUFF_CONFIGS.burn);
    expect(getBuffConfig('nope')).toBeUndefined();
  });
});
