import React from 'react';
import GameIcon from './GameIcon';

interface ItemGridItemProps {
  id: string;
  qty: number;
  name: string;
  onClick?: () => void;
  actionButton?: React.ReactNode;
}

// 物品格（ADR-0016）：移除悬浮提示（原生 title 与气泡），可点击时通过 onClick 打开详情弹窗
const ItemGridItem: React.FC<ItemGridItemProps> = ({ id, qty, name, onClick, actionButton }) => {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center justify-between p-2 bg-zinc-950/80 border border-zinc-850 hover:border-zinc-750/80 rounded-2xl transition-all relative group select-none ${
        clickable ? 'cursor-pointer active:scale-95' : ''
      } ${actionButton ? 'pb-2.5 pt-2' : 'aspect-square'}`}
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

      {/* 动作按钮插槽（阻止冒泡：避免未来与 onClick 并存时点按钮误开弹窗） */}
      {actionButton && (
        <div className="w-full mt-2.5 z-10" onClick={(e) => e.stopPropagation()}>
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default ItemGridItem;
