// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { CROPS_CONFIG } from './gameplay.loader';
import { ITEMS_CONFIG } from '../../data/items';

// 完整性 seam 五项检查的参考实现（config-json-migration 批次① 1.4）。
describe('farming/crops integrity（五项检查样板）', () => {
  const entries = Object.entries(CROPS_CONFIG);

  it('① id 唯一且与 key 一致', () => {
    const ids = entries.map(([, crop]) => crop.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [key, crop] of entries) expect(crop.id).toBe(key);
  });

  it('② 引用可解析：yields/seedCost 的 itemId 均存在于物品注册表', () => {
    for (const [, crop] of entries) {
      for (const itemId of Object.keys(crop.yields)) {
        expect(ITEMS_CONFIG[itemId]).toBeDefined();
      }
      for (const seedId of Object.keys(crop.seedCost)) {
        expect(ITEMS_CONFIG[seedId]).toBeDefined();
      }
    }
  });

  it('③ 必填字段非空：name/growthTime/description', () => {
    for (const [key, crop] of entries) {
      expect(crop.name, key).toBeTruthy();
      expect(crop.growthTime, key).toBeGreaterThan(0);
      expect(crop.description, key).toBeTruthy();
    }
  });

  it('⑤ 跨域抽查：growthTime 数值合理性（≤ 一昼夜量级）', () => {
    for (const [, crop] of entries) {
      expect(crop.growthTime).toBeLessThanOrEqual(3600);
    }
  });
});
