import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ENEMY_ICON_MAP, ZONE_ICON_MAP } from './iconMaps';
import { ITEMS_CONFIG } from '../configs/loaders/items.loader';
import { HEROES_CONFIG } from '../configs/loaders/entities.loader';
import { SHELTER_UPGRADES, FACILITIES_CONFIG, isFacilityType } from '../configs/loaders/shelter.loader';
import type { GameArt } from '../configs/types/art.types';

export type GameIconType = 'item' | 'hero' | 'enemy' | 'zone' | 'upgrade';

export interface GameIconProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  type: GameIconType;
}

// 配置源（ADR-0015 单一真相源）：视觉统一为 GameArt（切图 URL 或 Lucide 组件），
// 敌人/区域为纯 Lucide 映射（iconMaps 数据层）包装成 glyph。新增类型只需在注册表加一行。
interface ArtSource {
  name?: string;      // 汉字回退来源（取 name[0]）
  icon?: GameArt;     // 装配后视觉
}

const ICON_SOURCE_REGISTRY: Record<
  GameIconType,
  (id: string) => ArtSource | undefined
> = {
  hero: (id) => HEROES_CONFIG[id],
  item: (id) => ITEMS_CONFIG[id],
  enemy: (id) => {
    const mapped = ENEMY_ICON_MAP[id];
    return mapped ? { icon: { kind: 'glyph', Icon: mapped } } : undefined;
  },
  zone: (id) => {
    const mapped = ZONE_ICON_MAP[id];
    return mapped ? { icon: { kind: 'glyph', Icon: mapped } } : undefined;
  },
  // upgrade 注册兼容两表：设备图标读 FACILITIES_CONFIG（配置表驱动），全局升级读 SHELTER_UPGRADES
  upgrade: (id) => {
    const art = isFacilityType(id) ? FACILITIES_CONFIG[id].icon : SHELTER_UPGRADES[id]?.icon;
    return art ? { icon: art } : undefined;
  }
};

// 纯渲染器（ADR-0015 单一真相源）：三级回退链 切图 → Lucide → 单字汉字。
const GameIcon: React.FC<GameIconProps> = ({ id, type, className = 'w-4 h-4', ...rest }) => {
  const meta = ICON_SOURCE_REGISTRY[type](id);
  const art = meta?.icon;

  if (art?.kind === 'image') {
    return (
      <img
        src={art.url}
        alt={meta?.name ?? id}
        draggable={false}
        className={`object-contain select-none shrink-0 pointer-events-none ${className}`}
        {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  const Icon = art?.kind === 'glyph' ? art.Icon : HelpCircle;
  const fallbackChar = meta?.name?.[0] ?? '?';

  if (!art) {
    console.warn(`[GameIcon] 缺少视觉配置: "${id}"（type: "${type}"），以汉字回退渲染`);
  }

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 ${
        art ? '' : 'bg-amber-950/30 border border-dashed border-amber-500/60 text-amber-300 rounded'
      } ${className}`}
      title={art ? id : `[视觉待补] ${id}`}
      {...rest}
    >
      {art ? (
        <Icon className="w-[72%] h-[72%]" />
      ) : (
        <span className="text-[60%] leading-none font-black select-none">{fallbackChar}</span>
      )}
    </div>
  );
};

export default GameIcon;
