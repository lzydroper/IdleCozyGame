import React from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { RECIPES_CONFIG } from '../data/recipes';
import { ITEMS_CONFIG } from '../data/items';
import GameIcon from './GameIcon';
import ItemGridItem from './ItemGridItem';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { NIGHTMARE_CONFIG } from '../data/nightmareConfig';
import { Hammer, ShieldAlert, Zap } from 'lucide-react';

const WorkshopTab: React.FC = () => {
  const { state, setState, craftItem, useSupplyItem } = useGame();
  const { showToast } = useToast();

  const inventory = state.inventory;
  const player = state.player;
  const activeAlert = state.activeAlert;
  const novaDefPassive = SURVIVORS_CONFIG.find(s => s.id === 'nova')?.passives.find(p => p.type === 'defense_cost');
  const overloadEnergyCost = (state.hasNova && novaDefPassive) ? Math.round(20 * (novaDefPassive.multiplier ?? 1)) : 20;

  const supplyConfigs = [
    {
      id: 'ration' as const,
      colorClass: 'text-amber-500 border-amber-600/40 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400',
      effectText: '进食 (饱食+30)',
    },
    {
      id: 'energy_refill' as const,
      colorClass: 'text-cyan-400 border-cyan-400/40 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300',
      effectText: '更换罐 (魔能+30)',
    },
    {
      id: 'hot_stew' as const,
      colorClass: 'text-rose-500 border-rose-500/40 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400',
      effectText: '食用 (饱食+60, 生命+20)',
    },
    {
      id: 'nanite_injector' as const,
      colorClass: 'text-emerald-500 border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400',
      effectText: '注射 (生命+60, 饱食+10)',
    },
    {
      id: 'purifying_serum' as const,
      colorClass: 'text-purple-500 border-purple-500/40 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400',
      effectText: '净化 (污染-30, 理智+30)',
    }
  ];

  // 使用背包物品补给
  const handleUseItem = (itemId: 'ration' | 'energy_refill' | 'hot_stew' | 'nanite_injector' | 'purifying_serum') => {
    const success = useSupplyItem(itemId);
    if (!success) {
      showToast("储备不足！请先在工坊合成制造该物品。", "error");
      return;
    }

    const toastMsgMap: Record<typeof itemId, string> = {
      ration: "进食成功 (饱食度 +30)",
      energy_refill: "更换净化罐成功 (魔能 +30)",
      hot_stew: "食用热烩成功 (饱食度 +60, 生命值 +20)",
      nanite_injector: "注射纳米针成功 (生命值 +60, 饱食度 +10)",
      purifying_serum: "使用净化血清成功 (污染度 -30, 理智值 +30)"
    };

    showToast(toastMsgMap[itemId], "success");
  };

  const handleCraft = (recipeId: string) => {
    const success = craftItem(recipeId);
    if (success) {
      showToast("合成成功！", "success");
    } else {
      showToast("合成失败：原料不足。", "error");
    }
  };

  // 抵御梦魇入侵
  const handleDefendNightmare = (method: 'turret' | 'overload') => {
    if (activeAlert.type !== 'dream_leak') return;

    if (method === 'turret') {
      const turretQty = inventory.defensive_turret || 0;
      if (turretQty <= 0) {
        showToast("没有制造好的防御电磁塔！", "error");
        return;
      }

      setState(prev => {
        const newInventory = { ...prev.inventory };
        newInventory.defensive_turret = turretQty - 1;

        const newHp = Math.max(0, prev.activeAlert.hp - NIGHTMARE_CONFIG.turretDamage);
        const isDead = newHp <= 0;

        if (isDead) {
          newInventory.void_core = (newInventory.void_core || 0) + NIGHTMARE_CONFIG.turretReward.void_core;
        }

        return {
          ...prev,
          inventory: newInventory,
          activeAlert: {
            type: isDead ? null : prev.activeAlert.type,
            hp: newHp
          },
          exploration: {
            ...prev.exploration,
            dreamPollution: isDead ? 0 : prev.exploration.dreamPollution // 击杀后污染归零
          }
        };
      });
      showToast("电磁塔已启动，重创梦魇 (HP -35)", "success");
    } else if (method === 'overload') {
      const hasNova = !!state.hasNova || !!state.survivors.nova;
      const energyCost = overloadEnergyCost;
      const damage = hasNova ? 20 : 15;

      if (player.energy < energyCost) {
        showToast(`避难所魔能低于 ${energyCost}，核心无法超频过载！`, "error");
        return;
      }

      setState(prev => {
        const newPlayer = { ...prev.player };
        newPlayer.energy = Math.max(0, newPlayer.energy - energyCost);

        const newHp = Math.max(0, prev.activeAlert.hp - damage);
        const isDead = newHp <= 0;

        const newInventory = { ...prev.inventory };
        if (isDead) {
          newInventory.void_core = (newInventory.void_core || 0) + 1;
        }

        return {
          ...prev,
          player: newPlayer,
          inventory: newInventory,
          activeAlert: {
            type: isDead ? null : prev.activeAlert.type,
            hp: newHp
          },
          exploration: {
            ...prev.exploration,
            dreamPollution: isDead ? 0 : prev.exploration.dreamPollution
          }
        };
      });
      showToast(`核心超频过载，强光逼退梦魇 (HP -${damage})`, "warning");
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
    <div className="w-full pb-20 space-y-5">
      {/* 梦魇侵入紧急警报控制台 */}
      {activeAlert.type === 'dream_leak' && (
        <div className="p-5 rounded-3xl bg-red-950/30 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse flex flex-col gap-4">
          <div className="text-center">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-black text-red-400">🚨 警告：心灵梦魇入侵！</h3>
            <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
              虚空缝隙已被撕裂！一只梦魇怪物降临避难所。温室农田已被污染，植物已**停止生长**！请立即启动工坊防御机制歼灭怪兽。
            </p>
          </div>

          {/* 怪物血量条 */}
          <div className="p-3 bg-zinc-950 rounded-2xl border border-red-500/20 text-xs">
            <div className="flex justify-between font-bold text-red-400 mb-1">
              <span>侵入体：梦魔触手</span>
              <span>HP: {activeAlert.hp}</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${(activeAlert.hp / 60) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleDefendNightmare('turret')}
              className="py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 text-center cursor-pointer"
            >
              启动电磁塔 (扣1塔)
            </button>
            <button
              onClick={() => handleDefendNightmare('overload')}
              className="py-2.5 bg-zinc-900 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-xl transition-all active:scale-95 text-center cursor-pointer"
            >
              核心超频 (耗{overloadEnergyCost}魔能)
            </button>
          </div>
        </div>
      )}

      {/* 补给品快捷面板 - 扁平平铺，固定高度与滚动条 */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md transition-all">
        <h3 className="text-sm font-black text-white flex items-center gap-1.5 mb-3.5 select-none">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          避难所生存补给发放
        </h3>

        <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
          {supplyConfigs.map(cfg => {
            const meta = ITEMS_CONFIG[cfg.id];
            const qty = inventory[cfg.id] || 0;
            if (!meta) return null;

            return (
              <ItemGridItem
                key={cfg.id}
                id={cfg.id}
                qty={qty}
                name={meta.name}
                description={meta.description}
                actionButton={
                  <button
                    onClick={() => handleUseItem(cfg.id)}
                    disabled={qty <= 0}
                    className="w-full py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[8px] font-bold text-zinc-300 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer text-center"
                  >
                    <span className="sr-only">{cfg.effectText}</span>
                    使用
                  </button>
                }
              />
            );
          })}
        </div>
      </div>

      {/* 制造配方网格 */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-sm font-black text-white mb-4 flex items-center gap-1.5">
          <Hammer className="w-4 h-4 text-purple-400" />
          魔导合成配方蓝图
        </h3>
        <div className="space-y-4">
          {Object.values(RECIPES_CONFIG).map(recipe => {
            // 判断是否材料充足
            const canCraft = Object.entries(recipe.cost).every(([item, qty]) => (inventory[item] || 0) >= qty);

            return (
              <div key={recipe.id} className="p-3.5 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col gap-2.5 animate-fade-in">
                <div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                      <GameIcon type="item" id={recipe.id} className="w-4 h-4 mr-0.5" />
                      {recipe.name}
                      {recipe.id === 'sanity_capsule' && (
                        <span className="text-[9px] text-purple-400 font-extrabold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/30">
                          [当前充能: {state.exploration.capsulesCharge.sanity_capsule || 0}次]
                        </span>
                      )}
                    </h4>
                    <button
                      onClick={() => handleCraft(recipe.id)}
                      disabled={!canCraft}
                      className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-black rounded-lg transition-colors cursor-pointer"
                    >
                      制造合成
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{recipe.description}</p>
                </div>
                <div>
                  <h5 className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1">所需消耗:</h5>
                  <div className="flex flex-wrap gap-1">
                    {renderCostText(recipe.cost)}
                  </div>
                </div>
                {Object.keys(recipe.reward).length > 0 && (
                  <div>
                    <h5 className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1">⚡ 产出:</h5>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkshopTab;
