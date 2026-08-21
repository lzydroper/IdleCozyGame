import { describe, it, expect } from 'vitest';
import { createSaveThrottle, AUTO_SAVE_INTERVAL_MS } from './persistence';

// 04 号 04a：自动存盘节流 —— saveState 不再每次 state 变化都全量序列化+写盘，
// 改为节流（窗口内最多一次）；显式 saveState（切换/创建/删除账号）不受影响。
describe('createSaveThrottle（04 号 04a：自动存盘节流）', () => {
  it('首次调用立即放行，窗口内拦截，窗口到期后放行', () => {
    const throttle = createSaveThrottle(AUTO_SAVE_INTERVAL_MS);
    expect(throttle(1000)).toBe(true); // 首次（lastSave 为 null）
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS - 1)).toBe(false); // 窗口内拦截
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS)).toBe(true); // 窗口到期放行
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS + 1)).toBe(false); // 新窗口内拦截
  });

  it('不同实例各自独立计窗口', () => {
    const a = createSaveThrottle(5000);
    const b = createSaveThrottle(5000);
    expect(a(0)).toBe(true);
    expect(b(0)).toBe(true);
    expect(a(1000)).toBe(false);
    expect(b(1000)).toBe(false);
  });
});
