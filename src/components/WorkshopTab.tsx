import React from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { RECIPES_CONFIG } from '../data/recipes';
import { Hammer, ShieldAlert, Zap } from 'lucide-react';

const WorkshopTab: React.FC = () => {
  const { state, setState, craftItem } = useGame();
  const { showToast } = useToast();

  const inventory = state.inventory;
  const player = state.player;
  const activeAlert = state.activeAlert;

  // 使用背包物品补给
  const handleUseItem = (itemId: 'ration' | 'energy_refill') => {
    const qty = inventory[itemId] || 0;
    if (qty <= 0) {
      showToast("储备不足！请先在工坊合成制造该物品。", "error");
      return;
    }

    setState(prev => {
      const newInventory = { ...prev.inventory };
      newInventory[itemId] = qty - 1;

      const newPlayer = { ...prev.player };
      if (itemId === 'ration') {
        newPlayer.food = Math.min(100, newPlayer.food + 30); // 口粮回复30饱食度
      } else if (itemId === 'energy_refill') {
        newPlayer.energy = Math.min(100, newPlayer.energy + 30); // 电池回复30魔能
      }

      return {
        ...prev,
        inventory: newInventory,
        player: newPlayer
      };
    });
    showToast(itemId === 'ration' ? "进食成功 (饱食度 +30)" : "更换净化罐成功 (魔能 +30)", "success");
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

        const newHp = Math.max(0, prev.activeAlert.hp - 35);
        const isDead = newHp <= 0;

        // 若击杀，获得虚空结晶
        if (isDead) {
          newInventory.void_core = (newInventory.void_core || 0) + 1;
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
      if (player.energy < 20) {
        showToast("避难所魔能低于 20，核心无法超频过载！", "error");
        return;
      }

      setState(prev => {
        const newPlayer = { ...prev.player };
        newPlayer.energy = Math.max(0, newPlayer.energy - 20);

        const newHp = Math.max(0, prev.activeAlert.hp - 15);
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
      showToast("核心超频过载，强光逼退梦魇 (HP -15)", "warning");
    }
  };

  // 配方原料渲染辅助
  const renderCostText = (cost: Record<string, number>) => {
    return Object.entries(cost).map(([item, qty]) => {
      const label = {
        glow_fiber: "荧光纤维",
        aether_pulp: "以太果肉",
        scrap_metal: "废金属",
        dream_shard: "梦境碎片"
      }[item] || item;
      const current = inventory[item] || 0;
      const isEnough = current >= qty;

      return (
        <span
          key={item}
          className={`mr-2 inline-block px-1.5 py-0.5 rounded text-[10px] ${
            isEnough ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-red-950/40 text-red-400 border border-red-500/20'
          }`}
        >
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
              核心超频 (耗20魔能)
            </button>
          </div>
        </div>
      )}

      {/* 补给品快捷面板 */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-sm font-black text-white mb-3 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-cyan-400" />
          避难所生存补给发放
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-2xl flex flex-col justify-between h-24">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-500">防化口粮</span>
              <span className="text-zinc-500 font-bold">拥有: {inventory.ration || 0}</span>
            </div>
            <button
              onClick={() => handleUseItem('ration')}
              disabled={(inventory.ration || 0) <= 0}
              className="w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-600/40 disabled:opacity-30 disabled:pointer-events-none text-amber-400 font-bold rounded-lg transition-colors cursor-pointer"
            >
              进食 (饱食+30)
            </button>
          </div>

          <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-2xl flex flex-col justify-between h-24">
            <div className="flex justify-between items-center">
              <span className="font-bold text-cyan-400">魔能过滤罐</span>
              <span className="text-zinc-500 font-bold">拥有: {inventory.energy_refill || 0}</span>
            </div>
            <button
              onClick={() => handleUseItem('energy_refill')}
              disabled={(inventory.energy_refill || 0) <= 0}
              className="w-full py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-400/40 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 font-bold rounded-lg transition-colors cursor-pointer"
            >
              更换罐 (魔能+30)
            </button>
          </div>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkshopTab;
