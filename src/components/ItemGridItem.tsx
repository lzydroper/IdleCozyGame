import React from 'react';
import GameIcon from './GameIcon';

interface ItemGridItemProps {
  id: string;
  qty: number;
  name: string;
  description?: string;
  actionButton?: React.ReactNode;
}

const ItemGridItem: React.FC<ItemGridItemProps> = ({ id, qty, name, description, actionButton }) => {
  return (
    <div
      className={`flex flex-col items-center justify-between p-2 bg-zinc-950/80 border border-zinc-850 hover:border-zinc-750/80 rounded-2xl transition-all relative group select-none ${actionButton ? 'pb-2.5 pt-2' : 'aspect-square'}`}
      title={description ? `${name}\n${description}` : name}
    >
      {/* 物品大图标 */}
      <GameIcon type="item" id={id} className="w-14 h-14 mt-1" />

      {/* 常态化显示物品名称 */}
      <span className="text-[9px] text-zinc-400 font-extrabold truncate max-w-full text-center mt-1 select-none leading-none">
        {name}
      </span>

      {/* 数量标志 - 绝对定位贴在右上角 */}
      <span className="absolute top-1.5 right-2 text-[9px] font-black text-emerald-400 bg-zinc-900/90 border border-zinc-850 px-1.5 py-0.2 rounded-md shadow">
        x{qty}
      </span>

      {/* 悬浮 Tooltip 气泡 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-300 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
        {name}
      </div>

      {/* 动作按钮插槽 */}
      {actionButton && <div className="w-full mt-2.5 z-10">{actionButton}</div>}
    </div>
  );
};

export default ItemGridItem;
