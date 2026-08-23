// @vitest-environment node
/** 一次性转换器：survivors → json。运行后删除本文件与 data/survivors.ts。 */
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { SURVIVORS_CONFIG } from '../src/data/survivors';

describe('survivors 导出', () => {
  it('写 entities/survivors.json', () => {
    writeFileSync(
      join(process.cwd(), 'src', 'data', 'entities', 'survivors.json'),
      JSON.stringify(SURVIVORS_CONFIG, null, 2)
    );
    expect(SURVIVORS_CONFIG.length).toBe(9);
  });
});

import { join } from 'node:path';
