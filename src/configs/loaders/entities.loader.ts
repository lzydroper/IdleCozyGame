/**
 * entities 开放集合域装配（config-json-migration 批次③ 3.4）：
 * 敌人每实体一文件 glob 归并；身份取 json 内容 id（路径透明原则）。
 */
import type { EnemyConfig } from '../../data/entityConfig';
import { devGuardTable } from './devGuard';

const enemyModules = import.meta.glob('../../data/entities/enemies/*.json', {
  eager: true
}) as Record<string, { default: EnemyConfig }>;

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = devGuardTable(
  'entities/enemies',
  Object.fromEntries(
    Object.entries(enemyModules).map(([, mod]) => [mod.default.id, mod.default])
  )
);
