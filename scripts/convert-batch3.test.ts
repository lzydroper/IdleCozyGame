// @vitest-environment node
/**
 * 一次性转换器（config-json-migration 批次③）：enemies 每敌一文件；abilities 直存展开 + description token 化。
 * 运行：npx vitest run scripts/convert-batch3.test.ts —— 跑完即删。
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { ENEMY_CONFIGS } from '../src/data/enemies';
import { ABILITY_CONFIGS } from '../src/data/abilities';

const ROOT = join(process.cwd(), 'src', 'data');

interface CfgLike {
  id: string;
  description?: string;
  effects?: Array<{ params?: { amount?: { kind?: string; multiplier?: number; percent?: number; value?: number } } }>;
}

/** description 数值 token 化：数值唯一真相在 effects（04 号票 B1 修订）。 */
const tokenizeDescription = (cfg: CfgLike): string => {
  let desc = cfg.description ?? '';
  for (const eff of cfg.effects ?? []) {
    const amt = (eff.params as { amount?: CfgLike extends never ? never : { kind?: string; multiplier?: number; percent?: number; value?: number } } | undefined)?.amount;
    if (!amt) continue;
    if (amt.kind === 'attack' && typeof amt.multiplier === 'number') {
      desc = desc.replace(`${Math.round(amt.multiplier * 100)}%`, '{attackPct}');
    }
    if (amt.kind === 'maxHp' && typeof amt.percent === 'number') {
      desc = desc.replace(`${Math.round(amt.percent * 100)}%`, '{maxHpPct}');
    }
    if (amt.kind === 'flat') {
      desc = desc.replace(String(amt.value), '{flat}');
    }
  }
  return desc;
};

describe('batch③ 开放集合域 JSON 导出', () => {
  it('导出 enemies 与 abilities', () => {
    // --- enemies ---
    mkdirSync(join(ROOT, 'entities', 'enemies'), { recursive: true });
    for (const [id, cfg] of Object.entries(ENEMY_CONFIGS)) {
      writeFileSync(join(ROOT, 'entities', 'enemies', `${id}.json`), JSON.stringify(cfg, null, 2));
    }

    // --- abilities ---
    mkdirSync(join(ROOT, 'combat', 'abilities'), { recursive: true });
    const exported: string[] = [];
    for (const [key, cfg] of Object.entries(ABILITY_CONFIGS)) {
      const out = { ...cfg, description: tokenizeDescription(cfg as CfgLike) };
      writeFileSync(join(ROOT, 'combat', 'abilities', `${key}.json`), JSON.stringify(out, null, 2));
      exported.push(key);
    }
    console.log('ABILITIES =', exported.join(','));

    expect(exported).toContain('basic_attack');
    expect(exported.length).toBeGreaterThanOrEqual(10);
  });
});
