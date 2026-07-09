import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { ITEMS_CONFIG } from '../data/items';
import { SURVIVORS_CONFIG } from '../data/survivors';
import GameIcon from './GameIcon';
import ItemGridItem from './ItemGridItem';
import { BookOpen, Package, Users, Clock } from 'lucide-react';

// Force reload trigger: upgraded layout to ItemGridItem grid
const LogTab: React.FC = () => {
  const { state } = useGame();
  const [subTab, setSubTab] = useState<'logs' | 'survivors'>('logs');
  const [logFilter, setLogFilter] = useState<'all' | 'event' | 'harvest' | 'combat' | 'dream' | 'system'>('all');

  const { inventory, logs, survivors, exploration } = state;

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

  // Items in backpack with quantity > 0
  const backpackItems = Object.entries(inventory)
    .filter(([_, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const meta = ITEMS_CONFIG[itemId] || { id: itemId, name: itemId, emoji: '📦', description: '', category: 'special' };
      return { qty, ...meta };
    });

  // Survivor list mapping both state and config
  const survivorsList = SURVIVORS_CONFIG.map(config => {
    const activeData = survivors[config.id]; // Exists in state if resonance reached 100
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
  });

  return (
    <div className="w-full pb-20 space-y-4">
      {/* 1. 背包与临时物资区 */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-xs font-black text-zinc-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Package className="w-4 h-4 text-emerald-400" />
          避难所物资背囊
        </h3>
        {backpackItems.length === 0 ? (
          <p className="text-xs text-zinc-600 italic py-2 text-center">暂无储备物资，前往温室播种或地表探索收集</p>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {backpackItems.map(item => (
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
          <Users className="w-4 h-4" /> 幸存同伴 ({survivorsList.filter(s => s.status === 'rescued').length})
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
                let emoji = '⚙️';
                let textColor = 'text-zinc-400';
                if (log.type === 'event') { emoji = '🧭'; textColor = 'text-cyan-300'; }
                else if (log.type === 'logistics') { emoji = '🔩'; textColor = 'text-amber-400'; }
                else if (log.type === 'dream') { emoji = '🔮'; textColor = 'text-purple-300'; }
                else if (log.type === 'combat') { emoji = '💥'; textColor = 'text-red-300'; }
                else if (log.type === 'system') { emoji = '💾'; textColor = 'text-zinc-500'; }

                return (
                  <div key={log.id} className="text-[11px] leading-relaxed flex gap-2.5 pb-2 border-b border-zinc-950/30">
                    <span className="shrink-0">{emoji}</span>
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
          {survivorsList.map(surv => {
            let statusBadge = (
              <span className="text-[9px] bg-zinc-950 border border-zinc-900 text-zinc-600 px-2 py-0.5 rounded-full font-bold">
                未感知 (共鸣 {surv.resonance}%)
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
            const displayRole = isUnknown ? '职位不明' : (surv.role === 'farmer' ? '农学者' : surv.role === 'engineer' ? '工程师' : surv.role === 'scout' ? '侦察兵' : surv.role === 'guard' ? '卫兵' : surv.role === 'chemist' ? '药剂师' : '拾荒者');
            const displayBackstory = isUnknown ? '（正接收到废土中微弱的共鸣频率...当共鸣达到 100% 时即可精确定位此人的方位）' : surv.backstory;

            return (
              <div key={surv.id} className={`p-4 rounded-3xl border flex gap-4 transition-all duration-300 ${borderStyle}`}>
                <div className="w-14 h-14 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center bg-zinc-900/50 border border-zinc-800/40 opacity-90">
                  {isUnknown ? (
                    <span className="text-2xl select-none">❓</span>
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
                  
                  {surv.status === 'rescued' && (
                    <div className="text-[10px] text-purple-400 font-extrabold bg-purple-950/20 border border-purple-900/30 px-2.5 py-1 rounded-xl">
                      ⚙️ 同伴加成: {surv.bonusDescription}
                    </div>
                  )}

                  {surv.status === 'locked' && (
                    <p className="text-[10px] text-amber-500 font-bold">
                      💡 前往「地表探索」页，即可选择开启前往该地点的救援行动！
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LogTab;
