// 物品注册表一致性测试（数据层 seam）：单一真相源兜底，防止配置腐坏。
// 先例：src/data/heroes.test.ts（数据配置测试）。
import { describe, it, expect } from 'vitest';
import { ITEMS_CONFIG, ITEM_CATEGORIES } from './items.loader';
import { EQUIPMENT_CONFIG } from './equipment.loader';
import { HEROES_CONFIG } from './entities.loader';
import { SPRITE_URLS } from '../mappings/artMap';

// 旧 spritesheet 共享白名单已随切图管线退役：每条目独立 png 或 Lucide，无共享冲突概念。

describe('物品注册表一致性', () => {
  it('每条目 id 与 key 一致，category 均为合法枚举', () => {
    for (const [key, meta] of Object.entries(ITEMS_CONFIG)) {
      expect(meta.id).toBe(key);
      expect(ITEM_CATEGORIES).toContain(meta.category);
    }
  });

  it('按映射表归类：12 道具 / 39 资源 / 14 装备 / 2+英雄数 碎片', () => {
    const byCategory = (cat: string) =>
      Object.values(ITEMS_CONFIG).filter(m => m.category === cat).length;
    expect(byCategory('item')).toBe(12);
    expect(byCategory('resource')).toBe(39);
    expect(byCategory('equipment')).toBe(14);
    expect(byCategory('shard')).toBe(2 + Object.keys(HEROES_CONFIG).length);
  });

  it('错标的消耗品归道具，不再混入装备页', () => {
    for (const id of ['energy_refill', 'stimpack', 'canteen']) {
      expect(ITEMS_CONFIG[id].category, id).toBe('item');
    }
  });

  it('场景消耗装置归资源，道具仅限可主动使用（ADR-0016）', () => {
    for (const id of ['defensive_turret', 'shield_battery', 'geiger_counter', 'deflective_lens']) {
      expect(ITEMS_CONFIG[id].category, id).toBe('resource');
    }
  });

  it('食物与功能道具归道具', () => {
    for (const id of ['ration', 'hot_stew', 'ration_deluxe', 'sanity_capsule', 'warp_capsule', 'nanite_injector', 'purifying_serum', 'dream_lantern']) {
      expect(ITEMS_CONFIG[id].category, id).toBe('item');
    }
  });

  it('稳定/跃迁胶囊含梦境充能效果（1 个 = +1 次，ADR-0016）', () => {
    expect(ITEMS_CONFIG['sanity_capsule'].useEffect?.capsuleCharge?.sanity_capsule).toBe(1);
    expect(ITEMS_CONFIG['warp_capsule'].useEffect?.capsuleCharge?.warp_capsule).toBe(1);
  });

  it('种子、生产原料与货币归资源（含梦境碎片/梦魇之泪/虚空核心）', () => {
    for (const id of [
      'glow_fiber', 'mana_dust', 'aether_pulp', 'steel_petal', 'alloy_plate', 'scrap_metal',
      'magma_core', 'frost_crystal', 'plasma_cell', 'void_essence',
      'aether_ingot', 'crystal_silicon', 'nanite_slurry', 'rusted_spring', 'plasma_arc',
      'nightmare_tear', 'void_core', 'dream_shard', 'soul_echo',
      'seed_glow_grass', 'seed_aether_berry', 'seed_steel_sunflower', 'seed_magma_pepper',
      'seed_frost_bell', 'seed_plasma_pumpkin', 'seed_void_lotus', 'seed_echo_shroom',
      'seed_magnetic_clover', 'seed_solar_cactus', 'seed_stellar_rose', 'seed_nebula_moss',
      'seed_storm_sprout', 'seed_crystal_reed', 'seed_shadow_fern', 'seed_chrono_vine'
    ]) {
      expect(ITEMS_CONFIG[id], id).toBeDefined();
      expect(ITEMS_CONFIG[id].category, id).toBe('resource');
    }
  });

  it('碎片类：奥术星体、共鸣碎片与全部英雄专属碎片', () => {
    expect(ITEMS_CONFIG['arcane_orb'].category).toBe('shard');
    expect(ITEMS_CONFIG['resonance_shard'].category).toBe('shard');
    for (const heroId of Object.keys(HEROES_CONFIG)) {
      const meta = ITEMS_CONFIG[`shard_${heroId}`];
      expect(meta, `shard_${heroId}`).toBeDefined();
      expect(meta.category).toBe('shard');
      expect(meta.name).toContain(HEROES_CONFIG[heroId].name);
    }
  });

  it('装备类：12 件系列装备由 EQUIPMENT_CONFIG 派生，强化素材与图纸归装备', () => {
    expect(ITEMS_CONFIG['enhance_stone'].category).toBe('equipment');
    expect(ITEMS_CONFIG['blueprint_ember_armory'].category).toBe('equipment');
    expect(Object.values(EQUIPMENT_CONFIG)).toHaveLength(12);
    for (const cfg of Object.values(EQUIPMENT_CONFIG)) {
      const meta = ITEMS_CONFIG[cfg.id];
      expect(meta, cfg.id).toBeDefined();
      expect(meta.category).toBe('equipment');
      expect(meta.name).toBe(cfg.name);
      expect(meta.description).toBe(cfg.description);
    }
  });

  it('每条目装配后必有视觉（icon 单字段统一，切图 URL 或 Lucide 组件）', () => {
    for (const [id, meta] of Object.entries(ITEMS_CONFIG)) {
      expect(meta.icon, id).toBeDefined();
      if (meta.icon.kind === 'image') {
        expect(meta.icon.url, id).toContain('sprites');
      } else {
        expect(typeof meta.icon.Icon).toBe('object');
      }
    }
  });

  it('切图路径引用必须真实存在（artMap 构建期 glob 兜底之外的显式断言）', () => {
    for (const [id, meta] of Object.entries(ITEMS_CONFIG)) {
      if (meta.icon.kind === 'image') {
        expect(meta.icon.url.length, id).toBeGreaterThan(0);
      }
    }
    expect(SPRITE_URLS['entities/heroes/nova.png'], '英雄立绘切图在管线中').toBeDefined();
    expect(SPRITE_URLS['items/resources/glow_fiber.png']).toBeDefined();
  });
});
