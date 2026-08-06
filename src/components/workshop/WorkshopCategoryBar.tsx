import React from 'react';
import { WORKSHOP_CATEGORIES } from '../../data/workshopCategories';
import type { WorkshopCategory } from '../../data/workshopCategories';

// 工坊分类栏（ticket 03）：5 类（道具/资源/碎片/装备/建筑），无「全部」；
// 计数基于可见配方，空分类可点击查看空态（与背包 LogTab 一致）
interface WorkshopCategoryBarProps {
  active: WorkshopCategory;
  counts: Record<WorkshopCategory, number>;
  onChange: (cat: WorkshopCategory) => void;
}

const WorkshopCategoryBar: React.FC<WorkshopCategoryBarProps> = ({ active, counts, onChange }) => (
  <div className="flex gap-1.5 mb-3">
    {WORKSHOP_CATEGORIES.map(cat => {
      const CatIcon = cat.icon;
      const isActive = active === cat.id;
      return (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
            isActive
              ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-md'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <CatIcon className="w-3.5 h-3.5" />
          {cat.label}
          <span className="text-[8px] opacity-70">({counts[cat.id]})</span>
        </button>
      );
    })}
  </div>
);

export default WorkshopCategoryBar;
