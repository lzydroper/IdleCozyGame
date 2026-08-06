import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { RECIPES_CONFIG } from '../../data/recipes';
import { getRecipeCategory, isRecipeVisible } from '../../state/workshop';
import { WORKSHOP_CATEGORIES } from '../../data/workshopCategories';
import type { WorkshopCategory } from '../../data/workshopCategories';
import RecipeCard from './RecipeCard';
import WorkshopCategoryBar from './WorkshopCategoryBar';
import WorkshopEmptyState from './WorkshopEmptyState';
import { Hammer } from 'lucide-react';

// 工坊页面容器（ticket 02 拆分 / 05 后）：纯生产区域——分类栏 + 可见性过滤 + 配方网格
// 「避难所生存补给发放」面板已删除（背包已具备物品详情与批量使用能力）；
// 梦魇警报控制台已迁出至避难所运营页（DreamLeakAlertPanel，ticket 05）
const WorkshopTab: React.FC = () => {
  const { state } = useGame();
  const recipes = Object.values(RECIPES_CONFIG);

  // 可见性过滤（ticket 03）：蓝图锁定/已达上限配方隐藏；分类计数基于可见配方
  const visibleRecipes = recipes.filter(r => isRecipeVisible(state, r));
  const counts = Object.fromEntries(
    WORKSHOP_CATEGORIES.map(c => [c.id, visibleRecipes.filter(r => getRecipeCategory(r) === c.id).length])
  ) as Record<WorkshopCategory, number>;

  // 默认选中第一个非空分类（与背包 LogTab 一致）；空分类不禁用（可点击查看空态）
  const [activeCategory, setActiveCategory] = useState<WorkshopCategory>(
    () => WORKSHOP_CATEGORIES.find(c => counts[c.id] > 0)?.id ?? 'item'
  );
  const activeLabel = WORKSHOP_CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';
  const categoryRecipes = visibleRecipes.filter(r => getRecipeCategory(r) === activeCategory);

  return (
    <div className="w-full pb-20 space-y-5">
      {/* 制造配方网格（ticket 03：分类栏 + 可见性过滤 + 空态） */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-1.5">
          <Hammer className="w-4 h-4 text-purple-400" />
          魔导合成配方蓝图
        </h3>
        <WorkshopCategoryBar active={activeCategory} counts={counts} onChange={setActiveCategory} />
        {categoryRecipes.length === 0 ? (
          <WorkshopEmptyState label={activeLabel} />
        ) : (
          <div className="space-y-4">
            {categoryRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkshopTab;
