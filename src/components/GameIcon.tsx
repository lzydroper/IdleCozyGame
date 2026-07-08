import React from 'react';

export interface GameIconProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  type: 'item' | 'survivor';
}

type SheetType = 'seeds' | 'materials' | 'supplies' | 'survivors';

interface IconConfig {
  sheet: SheetType;
  index: number;
}

const ICON_CONFIG: Record<string, IconConfig> = {
  // survivors (3x3)
  roy: { sheet: 'survivors', index: 0 },
  mei: { sheet: 'survivors', index: 1 },
  zero: { sheet: 'survivors', index: 2 },
  catherine: { sheet: 'survivors', index: 3 },
  buster: { sheet: 'survivors', index: 4 },
  nova: { sheet: 'survivors', index: 5 },

  // 1. seeds (4x4)
  seed_glow_grass: { sheet: 'seeds', index: 0 },
  seed_aether_berry: { sheet: 'seeds', index: 1 },
  seed_steel_sunflower: { sheet: 'seeds', index: 2 },
  seed_magma_pepper: { sheet: 'seeds', index: 3 },
  seed_frost_bell: { sheet: 'seeds', index: 4 },
  seed_plasma_pumpkin: { sheet: 'seeds', index: 5 },
  seed_void_lotus: { sheet: 'seeds', index: 6 },

  // 2. materials (4x4)
  glow_fiber: { sheet: 'materials', index: 0 },
  mana_dust: { sheet: 'materials', index: 1 },
  aether_pulp: { sheet: 'materials', index: 2 },
  steel_petal: { sheet: 'materials', index: 3 },
  alloy_plate: { sheet: 'materials', index: 4 },
  scrap_metal: { sheet: 'materials', index: 5 },
  magma_core: { sheet: 'materials', index: 6 },
  frost_crystal: { sheet: 'materials', index: 7 },
  plasma_cell: { sheet: 'materials', index: 8 },
  void_essence: { sheet: 'materials', index: 9 },

  // 3. supplies (4x4)
  ration: { sheet: 'supplies', index: 0 },
  energy_refill: { sheet: 'supplies', index: 1 },
  defensive_turret: { sheet: 'supplies', index: 2 },
  sanity_capsule: { sheet: 'supplies', index: 3 },
  warp_capsule: { sheet: 'supplies', index: 4 },
  dream_shard: { sheet: 'supplies', index: 5 },
  hot_stew: { sheet: 'supplies', index: 6 },
  nanite_injector: { sheet: 'supplies', index: 7 },
  purifying_serum: { sheet: 'supplies', index: 8 },
  shield_battery: { sheet: 'supplies', index: 9 },
};

const GameIcon: React.FC<GameIconProps> = ({ id, type, className = 'w-4 h-4', ...rest }) => {
  const iconConfig = ICON_CONFIG[id];

  if (!iconConfig) {
    console.error(`[GameIcon] Missing icon config for ID: "${id}" (type: "${type}")`);
    return (
      <div
        className={`inline-flex items-center justify-center bg-rose-950 border border-rose-500 text-rose-400 font-bold select-none text-[10px] rounded shrink-0 ${className}`}
        title={`Missing: ${id}`}
      >
        ⚠️
      </div>
    );
  }

  // 幸存者是 3x3，物品类雪碧图（seeds, materials, supplies）都是 4x4
  const columns = iconConfig.sheet === 'survivors' ? 3 : 4;
  const rowCount = iconConfig.sheet === 'survivors' ? 3 : 4;

  const xPercent = columns > 1 ? (iconConfig.index % columns) * (100 / (columns - 1)) : 0;
  const yPercent = rowCount > 1 ? Math.floor(iconConfig.index / columns) * (100 / (rowCount - 1)) : 0;
  const sheetUrl = `/assets/spritesheet_${iconConfig.sheet}.png`;

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
