import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import { ITEMS_CONFIG } from '../../data/items';
import type { Recipe } from '../../types/config';
import { getRecipeDisplayName, getRecipeDescription } from '../../state/workshop';
import GameIcon from '../GameIcon';
import CraftBatchModal from './CraftBatchModal';
import { WORKSHOP_TOASTS } from './constants';
import { Zap } from 'lucide-react';

// 配方显示图标：取 reward 主产物；充能配方取 capsuleTarget；温室扩建回退电芯
const getRecipeIconId = (recipe: Recipe): string => {
  const rewardKeys = Object.keys(recipe.reward || {});
  if (rewardKeys.length > 0) return rewardKeys[0];
  if (recipe.special === 'capsule_charge' && recipe.capsuleTarget) return recipe.capsuleTarget;
  if (recipe.id === 'greenhouse_expansion') return 'plasma_cell';
  return recipe.id;
};

// 配方卡片（ticket 02 拆分）：图标/名称/描述/消耗/产出 + 「合成」x1 + 「批量」弹窗入口（ticket 04）
const RecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const { state, craftItem } = useGame();
  const { showToast } = useToast();
  const [batchOpen, setBatchOpen] = useState(false);
  const inventory = state.inventory;

  // 可见性过滤（ticket 03）保证进入本组件的配方已解锁；此处仅判断材料是否充足
  const canCraft = Object.entries(recipe.cost).every(([item, qty]) => (inventory[item] || 0) >= qty);

  const handleCraft = () => {
    const success = craftItem(recipe.id);
    if (success) {
      showToast(WORKSHOP_TOASTS.craftSuccess, 'success');
    } else {
      showToast(WORKSHOP_TOASTS.craftFail, 'error');
    }
  };

  // 配方原料渲染辅助
  const renderCostText = (cost: Record<string, number>) => {
    return Object.entries(cost).map(([item, qty]) => {
      const label = ITEMS_CONFIG[item]?.name || item;
      const current = inventory[item] || 0;
      const isEnough = current >= qty;

      return (
        <span
          key={item}
          className={`mr-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            isEnough ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-red-950/40 text-red-400 border border-red-500/20'
          }`}
        >
          <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
          {label}: {current}/{qty}
        </span>
      );
    });
  };

  return (
    <div className="p-3.5 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col gap-2.5 animate-fade-in">
      <div>
        <div className="flex justify-between items-center">
          <h4 className="font-black text-sm text-white flex items-center gap-1.5">
            <GameIcon type="item" id={getRecipeIconId(recipe)} className="w-4 h-4 mr-0.5" />
            {getRecipeDisplayName(recipe)}
            {recipe.id === 'sanity_capsule' && (
              <span className="text-[9px] text-purple-400 font-extrabold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/30">
                [当前充能: {state.exploration.capsulesCharge.sanity_capsule || 0}次]
              </span>
            )}
          </h4>
          <div className="flex gap-1.5">
            <button
              onClick={handleCraft}
              disabled={!canCraft}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
            >
              合成
            </button>
            {/* 温室扩建禁批量（ticket 04）：不显示「批量」入口 */}
            {recipe.special !== 'greenhouse_expansion' && (
              <button
                onClick={() => setBatchOpen(true)}
                disabled={!canCraft}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-200 text-xs font-black rounded-lg transition-colors cursor-pointer"
              >
                批量
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{getRecipeDescription(recipe)}</p>
      </div>
      <div>
        <h5 className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1">所需消耗:</h5>
        <div className="flex flex-wrap gap-1">
          {renderCostText(recipe.cost)}
        </div>
      </div>
      {Object.keys(recipe.reward).length > 0 && (
        <div>
          <h5 className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> 产出:</h5>
          <div className="flex flex-wrap gap-1">
            {Object.entries(recipe.reward).map(([item, qty]) => {
              const label = ITEMS_CONFIG[item]?.name || item;
              return (
                <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                  <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                  {label} x{qty}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 批量合成弹窗（ticket 04） */}
      {batchOpen && <CraftBatchModal recipe={recipe} onClose={() => setBatchOpen(false)} />}
    </div>
  );
};

export default RecipeCard;
