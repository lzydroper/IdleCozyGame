import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ENEMY_ICON_MAP, ZONE_ICON_MAP } from './iconMaps';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';

export interface GameIconProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  type: 'item' | 'survivor' | 'enemy' | 'zone';
}

// 纯渲染器（ADR-0015 单一真相源）：sprite 配置内聚于物品/英雄定义表，
// 未命中 sprite 时以 Lucide 回退 + 「待补 sprite」标记表露，方便后续补图。
const GameIcon: React.FC<GameIconProps> = ({ id, type, className = 'w-4 h-4', ...rest }) => {
  // 敌人/区域：无雪碧图，直接渲染 Lucide 映射
  if (type === 'enemy' || type === 'zone') {
    const Icon = (type === 'enemy' ? ENEMY_ICON_MAP : ZONE_ICON_MAP)[id] || HelpCircle;
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

  // 物品 / 英雄立绘：从各自的单一配置表取 sprite 与 Lucide 回退
  const meta = type === 'item' ? ITEMS_CONFIG[id] : type === 'survivor' ? HEROES_CONFIG[id] : undefined;
  const sprite = meta?.sprite;

  if (!sprite) {
    // 雪碧图缺失：以 Lucide 映射 + 醒目「待补 sprite」标记表露，方便后续补充（最终目标是全 sprite 化）
    const Icon = meta?.icon || HelpCircle;
    // 常态回退（Lucide 映射存在）用 debug 级别，避免高频渲染刷屏；仅完全无映射时告警
    if (!meta?.icon) {
      console.warn(`[GameIcon] 缺少 sprite 与 Lucide 映射: "${id}"（type: "${type}"）`);
    } else {
      console.debug(`[GameIcon] 缺少 sprite 配置: "${id}"（type: "${type}"），以 Lucide 待补标记渲染`);
    }
    return (
      <div
        className={`inline-flex items-center justify-center bg-amber-950/30 border border-dashed border-amber-500/60 text-amber-300 rounded select-none shrink-0 ${className}`}
        title={`[sprite 待补] ${id}`}
        {...rest}
      >
        <Icon className="w-[72%] h-[72%]" />
      </div>
    );
  }

  // 英雄立绘（survivors 雪碧图）是 3x3，物品类雪碧图（seeds, materials, supplies）都是 4x4
  const columns = sprite.sheet === 'survivors' ? 3 : 4;
  const rowCount = sprite.sheet === 'survivors' ? 3 : 4;

  const xPercent = columns > 1 ? (sprite.index % columns) * (100 / (columns - 1)) : 0;
  const yPercent = rowCount > 1 ? Math.floor(sprite.index / columns) * (100 / (rowCount - 1)) : 0;
  const sheetUrl = `/assets/spritesheet_${sprite.sheet}.png`;

  return (
    <div
      className={`block select-none shrink-0 bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: `${columns * 100}% auto`,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
      }}
      {...rest}
    />
  );
};

export default GameIcon;
