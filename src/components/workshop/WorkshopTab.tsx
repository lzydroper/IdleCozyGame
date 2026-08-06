import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import { RECIPES_CONFIG } from '../../data/recipes';
import { NIGHTMARE_CONFIG } from '../../data/nightmareConfig';
import { getDreamLockdownMinutes } from '../../state/nightmare';
import { getRecipeCategory, isRecipeVisible } from '../../state/workshop';
import { WORKSHOP_CATEGORIES } from '../../data/workshopCategories';
import type { WorkshopCategory } from '../../data/workshopCategories';
import RecipeCard from './RecipeCard';
import WorkshopCategoryBar from './WorkshopCategoryBar';
import WorkshopEmptyState from './WorkshopEmptyState';
import { Hammer, ShieldAlert, Siren, Skull, Shield, HeartCrack, HeartPulse } from 'lucide-react';

// 工坊页面容器（ticket 02 拆分）：梦魇警报（ticket 05 迁出）+ 分类栏（ticket 03）+ 配方网格
// 「避难所生存补给发放」面板已删除——背包已具备物品详情与批量使用能力（ticket 02）
const WorkshopTab: React.FC = () => {
  const { state, defendDreamLeak } = useGame();
  const { showToast } = useToast();

  const inventory = state.inventory;
  const activeAlert = state.activeAlert;
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

  // 抵御梦魇入侵（ticket 14）：出战当前小队防御，炮塔可选开战前辅助输出一轮
  const handleDefendNightmare = (method: 'turret' | 'direct') => {
    if (activeAlert.type !== 'dream_leak') return;

    const outcome = defendDreamLeak(method);
    if (outcome.failure) {
      const failureMsg: Record<string, string> = {
        no_alert: '当前没有梦魇入侵。',
        no_party: '请先在英雄面板上阵小队，才能出战防御！',
        wounded: '小队全员重伤，请先用纳米修复剂治愈英雄！',
        no_turret: '没有可部署的防御炮塔！'
      };
      showToast(failureMsg[outcome.failure], "error");
      return;
    }

    if (outcome.victory) {
      showToast("防御成功！梦魇被击退，获得虚空核心！", "success");
    } else if (outcome.partyWiped) {
      showToast(`防御失败！小队全员重伤，梦境被封锁 ${getDreamLockdownMinutes()} 分钟。`, "error");
    } else {
      showToast("梦魇退回阴影深处，可稍后再次迎战。", "info");
    }
  };

  return (
    <div className="w-full pb-20 space-y-5">
      {/* 梦魇侵入紧急警报控制台（ticket 14：出战小队防御，炮塔辅助；ticket 05 迁至后勤页） */}
      {activeAlert.type === 'dream_leak' && (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse flex flex-col gap-4">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-black text-red-400 flex items-center justify-center gap-1.5"><Siren className="w-5 h-5 text-red-500" /> 警告：心灵梦魇入侵！</h3>
            <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
              虚空缝隙已被撕裂！梦魇怪物顺着精神印记降临避难所，温室农田已被污染，植物已**停止生长**！请出战当前小队歼灭怪兽；防御失败将导致全员重伤并封锁梦境入口。
            </p>
          </div>

          {/* 怪物血量条 */}
          <div className="p-3 bg-zinc-950 rounded-2xl border border-red-500/20 text-xs">
            <div className="flex justify-between font-bold text-red-400 mb-1">
              <span>侵入体：{NIGHTMARE_CONFIG.leakName} <Skull className="w-3.5 h-3.5 inline-block -mt-0.5" /></span>
              <span>HP: {activeAlert.hp}</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (activeAlert.hp / NIGHTMARE_CONFIG.dreamLeakDamage) * 100)}%` }}
              />
            </div>
          </div>

          {/* 出战小队 */}
          <div className="p-3 bg-zinc-950 rounded-2xl border border-red-500/20 text-xs">
            <div className="flex justify-between font-bold text-zinc-300 mb-1">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 当前出战小队</span>
              <span className="text-zinc-500">{state.party.length}/3</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {state.party.length === 0 && <span className="text-zinc-600">尚未上阵英雄，无法防御！</span>}
              {state.party.map(id => {
                const hero = state.heroes[id];
                if (!hero) return null;
                return (
                  <span
                    key={id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                      hero.wounded
                        ? 'bg-red-950/40 border-red-700/40 text-red-400'
                        : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
                    }`}
                  >
                    {hero.wounded ? <><HeartCrack className="w-3 h-3" /> 重伤</> : <><HeartPulse className="w-3 h-3" /> 可战</>} {id}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleDefendNightmare('turret')}
              disabled={(inventory.defensive_turret || 0) < 1}
              className="py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 text-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              部署炮塔 + 出战 (先输出一轮, 扣1塔)
            </button>
            <button
              onClick={() => handleDefendNightmare('direct')}
              className="py-2.5 bg-zinc-900 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              直接出战防御
            </button>
          </div>
          <p className="text-[9px] text-zinc-500 text-center -mt-1">
            炮塔开战前造成 {NIGHTMARE_CONFIG.turretDamage} 点伤害；防御胜利掉落虚空核心 ×1，失败则全员重伤 + 梦境封锁 {getDreamLockdownMinutes()} 分钟
          </p>
        </div>
      )}

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
