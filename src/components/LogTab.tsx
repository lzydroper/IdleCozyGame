import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { ITEMS_CONFIG } from '../data/items';
import { SURVIVORS_CONFIG } from '../data/survivors';
import GameIcon from './GameIcon';
import ItemGridItem from './ItemGridItem';
import { BookOpen, Package, Users, Clock, Settings, Compass, Cog, MoonStar, Swords, Save, RadioTower, HelpCircle, Lightbulb, CookingPot, Shield, Layers, Gem } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItemMeta } from '../data/items';

// 背包分类切页（ticket 22）：4 大分类，无「全部」；基于 ItemMeta.category 映射
// 消耗品=food、装备=equipment、材料=material+seed、碎片=special
type BackpackCategory = 'consumable' | 'equipment' | 'material' | 'shard';

const BACKPACK_CATEGORIES: { id: BackpackCategory; label: string; icon: LucideIcon; matches: (cat: ItemMeta['category']) => boolean }[] = [
  { id: 'consumable', label: '消耗品', icon: CookingPot, matches: c => c === 'food' },
  { id: 'equipment', label: '装备', icon: Shield, matches: c => c === 'equipment' },
  { id: 'material', label: '材料', icon: Layers, matches: c => c === 'material' || c === 'seed' },
  { id: 'shard', label: '碎片', icon: Gem, matches: c => c === 'special' },
];

// 日志类型图标映射（替代 emoji 暂代）
const LOG_TYPE_ICONS: Record<string, LucideIcon> = {
  event: Compass,
  logistics: Cog,
  dream: MoonStar,
  combat: Swords,
  system: Save,
};

// Force reload trigger: upgraded layout to ItemGridItem grid
const LogTab: React.FC = () => {
  const { state } = useGame();
  const [subTab, setSubTab] = useState<'logs' | 'survivors'>('logs');
  const [logFilter, setLogFilter] = useState<'all' | 'event' | 'harvest' | 'combat' | 'dream' | 'system'>('all');

  const { inventory, logs, survivors, exploration } = state;

  // Items in backpack with quantity > 0
  const backpackItems = Object.entries(inventory)
    .filter(([_, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const meta = ITEMS_CONFIG[itemId] || { id: itemId, name: itemId, description: '', category: 'special' as const };
      return { qty, ...meta };
    });

  // 无「全部」分类：默认选中第一个非空分类，避免开局看到空列表
  const [backpackCat, setBackpackCat] = useState<BackpackCategory>(
    BACKPACK_CATEGORIES.find(cat => backpackItems.some(it => cat.matches(it.category)))?.id ?? 'consumable'
  );

  // 当前分类被耗尽（物品用光/切存档）时，自动回退到第一个非空分类
  useEffect(() => {
    if (backpackItems.length === 0) return;
    const active = BACKPACK_CATEGORIES.find(c => c.id === backpackCat);
    if (!active) return;
    const isEmpty = !backpackItems.some(it => active.matches(it.category));
    if (isEmpty) {
      const next = BACKPACK_CATEGORIES.find(c => backpackItems.some(it => c.matches(it.category)))?.id ?? 'consumable';
      setBackpackCat(next);
    }
  }, [backpackItems, backpackCat]);

  const visibleBackpackItems = backpackItems.filter(it =>
    BACKPACK_CATEGORIES.find(c => c.id === backpackCat)?.matches(it.category)
  );

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

  // 需求 1：只展示已产生联系（共鸣 > 0）或已获取的幸存者，过滤掉完全未接触过的
  const survivorsList = SURVIVORS_CONFIG
    .map(config => {
      const activeData = survivors[config.id];
      const resonance = exploration.survivorResonance?.[config.id] || (activeData ? 100 : 0);

      let status: 'unknown' | 'locked' | 'rescued' = 'unknown';
      if (activeData) {
        if (activeData.realityLocationId) {
          status = 'locked'; // Known location, not rescued
        } else {
          status = 'rescued'; // Rescued!
        }
      }

      return {
        ...config,
        resonance,
        status,
        isAssigned: activeData?.isAssigned || false,
      };
    })
    // 需求 1：过滤掉 resonance=0 且 status='unknown' 的（完全没有接触过的）
    .filter(s => s.resonance > 0 || s.status !== 'unknown');

  return (
    <div className="w-full pb-20 space-y-4">
      {/* 1. 背包与临时物资区 */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-xs font-black text-zinc-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Package className="w-4 h-4 text-emerald-400" />
          避难所物资背囊
        </h3>

        {/* 分类切页（ticket 22）：4 大分类，无「全部」；空分类禁用并显示数量 */}
        <div className="flex gap-1.5 mb-3">
          {BACKPACK_CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const count = backpackItems.filter(it => cat.matches(it.category)).length;
            const active = backpackCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setBackpackCat(cat.id)}
                disabled={count === 0}
                className={`flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
                <span className="text-[8px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {backpackItems.length === 0 ? (
          <p className="text-xs text-zinc-600 italic py-2 text-center">暂无储备物资，前往温室播种或地表探索收集</p>
        ) : visibleBackpackItems.length === 0 ? (
          <p className="text-xs text-zinc-600 italic py-2 text-center">该分类暂无物资</p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {visibleBackpackItems.map(item => (
              <ItemGridItem
                key={item.id}
                id={item.id}
                qty={item.qty}
                name={item.name}
                description={item.description}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. 双Tab控制导航栏 */}
      <div className="flex border-b border-zinc-900">
        <button
          onClick={() => setSubTab('logs')}
          className={`flex-1 pb-2 text-xs font-extrabold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            subTab === 'logs' ? 'text-emerald-400 border-emerald-500' : 'text-zinc-500 border-transparent hover:text-zinc-400'
          }`}
        >
          <BookOpen className="w-4 h-4" /> 避难所日志
        </button>
        <button
          onClick={() => setSubTab('survivors')}
          className={`flex-1 pb-2 text-xs font-extrabold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            subTab === 'survivors' ? 'text-purple-400 border-purple-500' : 'text-zinc-500 border-transparent hover:text-zinc-400'
          }`}
        >
          <Users className="w-4 h-4" /> 幸存同伴 ({survivorsList.filter(s => s.status === 'rescued').length}/{survivorsList.length} 已联系)
        </button>
      </div>

      {/* 3. 子Tab渲染 */}
      {subTab === 'logs' ? (
        <div className="space-y-3">
          {/* 日志分类按钮组 */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: '全部', color: 'text-zinc-300 hover:bg-zinc-800' },
              { id: 'event', label: '探险', color: 'text-cyan-400 hover:bg-cyan-950/20' },
              { id: 'logistics', label: '后勤', color: 'text-amber-400 hover:bg-amber-950/20' },
              { id: 'dream', label: '梦境', color: 'text-purple-400 hover:bg-purple-950/20' },
              { id: 'combat', label: '战斗', color: 'text-red-400 hover:bg-red-950/20' },
              { id: 'system', label: '系统', color: 'text-zinc-400 hover:bg-zinc-800' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setLogFilter(filter.id as any)}
                className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                  logFilter === filter.id
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 shadow-md'
                    : 'bg-zinc-950 border-zinc-900/50 ' + filter.color
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* 日志列表 */}
          <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 max-h-96 overflow-y-auto space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-zinc-600 italic py-6 text-center">暂无此类日志记录</p>
            ) : (
              filteredLogs.map(log => {
                const LogTypeIcon = LOG_TYPE_ICONS[log.type] || Settings;
                let textColor = 'text-zinc-400';
                if (log.type === 'event') { textColor = 'text-cyan-300'; }
                else if (log.type === 'logistics') { textColor = 'text-amber-400'; }
                else if (log.type === 'dream') { textColor = 'text-purple-300'; }
                else if (log.type === 'combat') { textColor = 'text-red-300'; }
                else if (log.type === 'system') { textColor = 'text-zinc-500'; }

                return (
                  <div key={log.id} className="text-[11px] leading-relaxed flex gap-2.5 pb-2 border-b border-zinc-950/30">
                    <span className="shrink-0 mt-0.5"><LogTypeIcon className="w-3 h-3" /></span>
                    <div className="flex-1">
                      <p className={textColor}>{log.text}</p>
                      <span className="text-[8px] text-zinc-600 font-bold block mt-0.5 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Survivors SubTab */
        <div className="space-y-3.5">
          {survivorsList.length === 0 ? (
            <div className="text-center py-10 text-zinc-600 text-xs italic space-y-2">
              <div className="text-2xl mb-3"><RadioTower className="w-8 h-8 mx-auto text-zinc-600" /></div>
              <p>尚未感知到任何幸存者信号</p>
              <p className="text-[10px] text-zinc-700">前往「梦境」或「荒野探索」以建立共鸣联系</p>
            </div>
          ) : (
            survivorsList.map(surv => {
              let statusBadge = (
                <span className="text-[9px] bg-zinc-950 border border-zinc-900 text-zinc-600 px-2 py-0.5 rounded-full font-bold">
                  感知中 (共鸣 {surv.resonance}%)
                </span>
              );
              let borderStyle = 'border-zinc-900/60 bg-zinc-950/30 opacity-60';

              if (surv.status === 'locked') {
                borderStyle = 'border-amber-500/20 bg-zinc-900/40';
                statusBadge = (
                  <span className="text-[9px] bg-amber-950/60 border border-amber-800 text-amber-400 px-2 py-0.5 rounded-full font-black">
                    现实坐标锁定 (待营救：{
                      (() => { const l2 = EXPEDITION_LOCATIONS[surv.realityLocationId || '']; return l2?.shortName || l2?.displayName || '信号塔'; })()
                    })
                  </span>
                );
              } else if (surv.status === 'rescued') {
                borderStyle = 'border-purple-500/30 bg-purple-950/5';
                statusBadge = (
                  <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded-full font-black animate-pulse">
                    已加入避难所 ({surv.isAssigned ? '协助工作中' : '待命'})
                  </span>
                );
              }

              const isUnknown = surv.status === 'unknown';
              const displayName = isUnknown ? '未知幸存者信号' : surv.name;
              // 需求 2：使用数据配置中的 roleLabel 而非硬编码 ternary
              const displayRole = isUnknown ? '职位不明' : surv.roleLabel;
              const displayBackstory = isUnknown ? '（正接收到废土中微弱的共鸣频率...当共鸣达到 100% 时即可精确定位此人的方位）' : surv.backstory;

              return (
                <div key={surv.id} className={`p-4 rounded-3xl border flex gap-4 transition-all duration-300 ${borderStyle}`}>
                  <div className="w-14 h-14 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center bg-zinc-900/50 border border-zinc-800/40 opacity-90">
                    {isUnknown ? (
                      <HelpCircle className="w-8 h-8 text-zinc-600" />
                    ) : (
                      <GameIcon type="survivor" id={surv.id} className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        {displayName}
                        <span className="text-[9px] uppercase tracking-wider bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800 text-zinc-500 font-bold">
                          {displayRole}
                        </span>
                      </h4>
                      {statusBadge}
                    </div>
                    <p className={`text-[10px] leading-relaxed ${isUnknown ? 'text-zinc-600 italic font-medium' : 'text-zinc-500'}`}>{displayBackstory}</p>

                    {surv.status === 'locked' && (
                      <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 shrink-0" />
                        前往「地表探索」页，即可选择开启前往该地点的救援行动！
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LogTab;
