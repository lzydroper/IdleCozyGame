/**
 * gameplay 域装配（config-json-migration 批次① 1.4 json 试点）：
 * 静态 import + 单点断言 + DEV 守卫，出口即定型注册表。
 * 消费方只 import 本文件，不直接触达 data/*.json。
 */

import cropsJson from '../../data/farming/crops.json';
import type { CropConfig } from '../../types/config';
import { devGuardTable } from './devGuard';

export const CROPS_CONFIG: Record<string, CropConfig> = devGuardTable(
  'farming/crops',
  cropsJson as Record<string, CropConfig>,
  { required: ['name', 'growthTime', 'yields', 'seedCost'] }
);
