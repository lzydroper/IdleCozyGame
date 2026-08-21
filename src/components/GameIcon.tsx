import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ENEMY_ICON_MAP, ZONE_ICON_MAP } from './iconMaps';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { FACILITIES_CONFIG, isFacilityType } from '../data/facilities';
import type { ItemSheet, ItemSprite } from '../data/items/types';

export type GameIconType = 'item' | 'hero' | 'enemy' | 'zone' | 'upgrade';

export interface GameIconProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  type: GameIconType;
}

// 配置源（ADR-0015 单一真相源）：物品/英雄的 sprite 与 Lucide 回退内聚在各自配置表，
// 敌人/区域为纯 Lucide 映射（iconMaps 数据层）。新增类型只需在注册表加一行。
interface IconSource {
  name?: string;        // 汉字回退来源（取 name[0]）
  sprite?: ItemSprite;  // spritesheet 图块
  icon?: LucideIcon;    // Lucide 回退
}

const ICON_SOURCE_REGISTRY: Record<
  GameIconType,
  { source: (id: string) => IconSource | undefined; expectsSprite: boolean }
> = {
  hero: { source: (id) => HEROES_CONFIG[id], expectsSprite: true },
  item: { source: (id) => ITEMS_CONFIG[id], expectsSprite: true },
  enemy: { source: (id) => ({ icon: ENEMY_ICON_MAP[id] }), expectsSprite: false },
  zone: { source: (id) => ({ icon: ZONE_ICON_MAP[id] }), expectsSprite: false },
  // upgrade 注册兼容两表：设备图标读 FACILITIES_CONFIG（配置表驱动），全局升级读 SHELTER_UPGRADES
  upgrade: { source: (id) => ({ icon: isFacilityType(id) ? FACILITIES_CONFIG[id].icon : SHELTER_UPGRADES[id]?.icon }), expectsSprite: false },
};

// spritesheet 网格规格：英雄立绘（survivors）3x3，物品类（seeds/materials/supplies）4x4
const SPRITE_GRID: Record<ItemSheet, { columns: number; rows: number }> = {
  survivors: { columns: 3, rows: 3 },
  seeds: { columns: 4, rows: 4 },
  materials: { columns: 4, rows: 4 },
  supplies: { columns: 4, rows: 4 },
};

// 纯渲染器（ADR-0015 单一真相源）：三级回退链 sprite → Lucide → 单字汉字。
// 物品/英雄缺失 sprite 时以「待补 sprite」虚线框表露补图进度；敌人/区域无 sprite 概念，直接渲染 Lucide。
const GameIcon: React.FC<GameIconProps> = ({ id, type, className = 'w-4 h-4', ...rest }) => {
  const { source, expectsSprite } = ICON_SOURCE_REGISTRY[type];
  const meta = source(id);
  const sprite = meta?.sprite;

  if (!sprite) {
    const Icon = meta?.icon || HelpCircle;
    const fallbackChar = meta?.name?.[0] ?? '?';
    if (!expectsSprite) {
      // 敌人/区域：无雪碧图概念，直接渲染 Lucide 映射
      return (
        <div
          className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
          title={id}
          {...rest}
        >
          <Icon className="w-[72%] h-[72%]" />
        </div>
      );
    }
    // 物品/英雄：Lucide 或汉字回退 + 「待补 sprite」标记
    if (!meta?.icon) {
      console.warn(`[GameIcon] 缺少 sprite 与 Lucide 映射: "${id}"（type: "${type}"），以汉字回退渲染`);
    } else {
      console.debug(`[GameIcon] 缺少 sprite 配置: "${id}"（type: "${type}"），以 Lucide 待补标记渲染`);
    }
    return (
      <div
        className={`inline-flex items-center justify-center bg-amber-950/30 border border-dashed border-amber-500/60 text-amber-300 rounded select-none shrink-0 ${className}`}
        title={meta?.icon ? `[sprite 待补] ${id}` : id}
        {...rest}
      >
        {meta?.icon ? (
          <Icon className="w-[72%] h-[72%]" />
        ) : (
          <span className="text-[60%] leading-none font-black select-none">{fallbackChar}</span>
        )}
      </div>
    );
  }

  const grid = SPRITE_GRID[sprite.sheet];
  const xPercent = grid.columns > 1 ? (sprite.index % grid.columns) * (100 / (grid.columns - 1)) : 0;
  const yPercent = grid.rows > 1 ? Math.floor(sprite.index / grid.columns) * (100 / (grid.rows - 1)) : 0;
  const sheetUrl = `/assets/spritesheet_${sprite.sheet}.png`;

  return (
    <div
      className={`block select-none shrink-0 bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: `${grid.columns * 100}% auto`,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
      }}
      {...rest}
    />
  );
};

export default GameIcon;
