import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ITEMS_CONFIG } from '../data/items';
import ItemGridItem from './ItemGridItem';
import ItemDetailModal from './ItemDetailModal';
import { BookOpen, Package, Clock, Settings, Compass, Cog, MoonStar, Swords, Save, CookingPot, Shield, Layers, Gem } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItemCategory } from '../data/items';

// 背包分类切页：4 大分类直接绑定 ItemMeta.category 枚举（ADR-0014），无「全部」
// 道具=可主动使用、资源=生产消耗物（原料/种子/货币）、碎片=英雄碎片与觉醒素材、装备=装备生态
type BackpackCategory = ItemCategory;

const BACKPACK_CATEGORIES: { id: BackpackCategory; label: string; icon: LucideIcon }[] = [
  { id: 'item', label: '道具', icon: CookingPot },
  { id: 'resource', label: '资源', icon: Layers },
  { id: 'shard', label: '碎片', icon: Gem },
  { id: 'equipment', label: '装备', icon: Shield },
];

// 日志类型图标映射（替代 emoji 暂代）
const LOG_TYPE_ICONS: Record<string, LucideIcon> = {
  event: Compass,
  logistics: Cog,
  dream: MoonStar,
  combat: Swords,
  system: Save,
};

const LogTab: React.FC = () => {
  const { state } = useGame();
  const [logFilter, setLogFilter] = useState<'all' | 'event' | 'harvest' | 'combat' | 'dream' | 'system'>('all');
  // 选中物品详情弹窗（ADR-0016）：null = 关闭
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { inventory, equipmentInventory, logs } = state;

  // 背囊物品：计数物品聚合数量；装备不可堆叠（ADR-0017）——每件实例独立一格（含强化/神话徽章）
  const countedItems = Object.entries(inventory)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const meta = ITEMS_CONFIG[itemId] || { id: itemId, name: itemId, description: '', category: 'special' as const };
      return { kind: 'counted' as const, key: itemId, qty, ...meta };
    });
  const equipItems = Object.entries(equipmentInventory || {}).flatMap(([itemId, instances]) =>
    instances.map((instance, i) => {
      const meta = ITEMS_CONFIG[itemId] || { id: itemId, name: itemId, description: '', category: 'special' as const };
      return { kind: 'equip' as const, key: `${itemId}#${i}`, qty: 1, enhance: instance.enhance, mythic: instance.mythic, ...meta };
    })
  );
  const backpackItems = [...countedItems, ...equipItems];

  // 无「全部」分类：默认选中第一个非空分类，避免开局看到空列表；
  // 空分类不禁用（用户可点击查看空状态），故无自动回退逻辑
  const [backpackCat, setBackpackCat] = useState<BackpackCategory>(
    BACKPACK_CATEGORIES.find(cat => backpackItems.some(it => cat.id === it.category))?.id ?? 'item'
  );

  const visibleBackpackItems = backpackItems.filter(it =>
    BACKPACK_CATEGORIES.find(c => c.id === backpackCat)?.id === it.category
  );

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

  return (
    <div className="w-full pb-20 space-y-4">
      {/* 1. 避难所物资背囊（固定高度 h-56，切换页面不跳动） */}
      <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md">
        <h3 className="text-xs font-black text-zinc-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
          <Package className="w-4 h-4 text-emerald-400" />
          避难所物资背囊
        </h3>

        {/* 分类切页：4 大分类，无「全部」；空分类可点击查看空状态（无禁用） */}
        <div className="flex gap-1.5 mb-3">
          {BACKPACK_CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const count = backpackItems.filter(it => cat.id === it.category).length;
            const active = backpackCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setBackpackCat(cat.id)}
                className={`flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
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

        {/* 固定 224px 高：物资网格内部滚动，空状态居中提示（无高度跳动） */}
        <div className="h-56">
          {backpackItems.length === 0 ? (
            <p className="h-full flex items-center justify-center text-xs text-zinc-600 italic text-center">暂无储备物资，前往温室播种或地表探索收集</p>
          ) : visibleBackpackItems.length === 0 ? (
            <p className="h-full flex items-center justify-center text-xs text-zinc-600 italic text-center">该分类暂无物资</p>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 h-full overflow-y-auto pr-1">
              {visibleBackpackItems.map(item => (
                <ItemGridItem
                  key={item.key}
                  id={item.id}
                  qty={item.qty}
                  name={item.name}
                  enhance={item.kind === 'equip' ? item.enhance : undefined}
                  mythic={item.kind === 'equip' ? item.mythic : undefined}
                  onClick={() => setSelectedItemId(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. 避难所日志 */}
      <div className="flex border-b border-zinc-900">
        <span className="flex-1 pb-2 text-xs font-extrabold flex items-center justify-center gap-1.5 text-emerald-400 border-b-2 border-emerald-500">
          <BookOpen className="w-4 h-4" /> 避难所日志
        </span>
      </div>

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

      {/* 物品详情弹窗（ADR-0016）：点击背包物品打开，使用区由后续票据接入 */}
      {selectedItemId && (
        <ItemDetailModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
};

export default LogTab;
