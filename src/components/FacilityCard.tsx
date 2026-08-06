import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { ITEMS_CONFIG } from '../data/items';
import { SHELTER_UPGRADES, FACILITY_EXPANSION } from '../data/shelterUpgrades';
import { getQueueCapacity, getActualDuration } from '../state/facility';
import { getRecipeDisplayName } from '../state/workshop';
import GameIcon from './GameIcon';
import type { AutomationFacility, FacilityType } from '../types/game';
import { Flame, Wrench, Play, Square, ChevronRight, TrendingUp, Plus, X, Layers } from 'lucide-react';

// ─────────────────────────────────────────────
// 共用子组件：配方消耗/产出展示行
// ─────────────────────────────────────────────
function RecipeRow({
  label,
  items,
  getInvQty,
  accent,
}: {
  label: string;
  items: Record<string, number>;
  getInvQty: (id: string) => number;
  accent?: 'rose' | 'emerald';
}) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(items).map(([id, qty]) => {
          const have = getInvQty(id);
          const item = ITEMS_CONFIG[id];
          const insufficient = accent === 'rose' && have < qty;
          return (
            <span
              key={id}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border ${
                insufficient
                  ? 'bg-rose-900/20 border-rose-700/40 text-rose-400'
                  : accent === 'emerald'
                  ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300'
                  : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-300'
              }`}
            >
              <GameIcon type="item" id={id} className="w-3.5 h-3.5 flex-shrink-0" title={item?.name || id} />
              <span>{item?.name || id}</span>
              <span className="font-bold">×{qty}</span>
              {accent === 'rose' && (
                <span className={`${insufficient ? 'text-rose-500' : 'text-zinc-500'}`}>/{have}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// 设施主题：集中配色，避免逐层透传
interface FacilityTheme {
  accent: string;
  glow: string;
  barClass: string;
  runningBg: string;
  iconBg: string;
  iconBorder: string;
}

// ─────────────────────────────────────────────
// 单台设施卡片：FIFO 配方队列 + 等级/效率 + 启停（ticket 13）
// ─────────────────────────────────────────────
function FacilityUnitCard({
  type,
  unitIndex,
  theme,
  icon,
}: {
  type: FacilityType;
  unitIndex: number;
  theme: FacilityTheme;
  icon: React.ReactNode;
}) {
  const {
    state,
    upgradeShelterStat,
    enqueueRecipe,
    removeQueueEntry,
    setFacilityActive,
    addLog,
  } = useGame();
  const { showToast } = useToast();
  const [selectedRecipe, setSelectedRecipe] = useState('');

  const { accent, glow, barClass, runningBg, iconBg, iconBorder } = theme;
  const units = state.shelter.facilities[type];
  const fac: AutomationFacility | undefined = units?.[unitIndex];
  if (!fac) return null;

  const level = fac.level || 1;
  const upgrade = SHELTER_UPGRADES[type];
  const isMax = level >= upgrade.maxLevel;
  const nextConfig = upgrade.levels.find(l => l.level === level + 1);
  // 产线纯自动：效率由设施等级决定（每级 +10%，与 shelterUpgrades 配置一致）
  const speedBonus = 1 + level * 0.1;
  const capacity = getQueueCapacity(level);
  const recipes = Object.values(AUTO_RECIPES).filter(r => r.facilityId === type);
  const getInvQty = (id: string) => state.inventory[id] || 0;
  const canAffordUpgrade = nextConfig ? Object.entries(nextConfig.cost).every(([itemId, qty]) => getInvQty(itemId) >= qty) : false;

  const headRecipe = fac.queue.length > 0 ? AUTO_RECIPES[fac.queue[0]] : null;
  const isPaused = !!headRecipe && fac.timeLeft === 0 &&
    !Object.entries(headRecipe.cost).every(([itemId, qty]) => getInvQty(itemId) >= qty);
  const isRunning = fac.active !== false && fac.queue.length > 0;
  const progress = fac.currentProgress || 0;
  const cycleTime = headRecipe ? getActualDuration(headRecipe.id, level) : 0;

  const handleEnqueue = () => {
    if (!selectedRecipe) return;
    if (enqueueRecipe(type, unitIndex, selectedRecipe)) {
      showToast('配方已入队，按顺序自动执行。', 'success');
      setSelectedRecipe('');
    } else {
      showToast('入队失败：队列已满或配方无效。', 'error');
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
      {/* 顶部彩色条纹 */}
      <div className={`h-0.5 w-full ${glow}`} />
      {/* 运行中脉冲指示 */}
      {isRunning && fac.timeLeft > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className={`text-[9px] ${accent} font-mono`}>运行中</span>
          <div className={`w-2 h-2 ${accent} rounded-full animate-ping`} />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* ── 标题栏：名称 + 第N台 + 等级 + 升级 ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${iconBg} border ${iconBorder} flex items-center justify-center`}>
              {icon}
            </div>            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                {fac.name} {units.length > 1 && <span className="text-[9px] text-zinc-500">{unitIndex + 1}号</span>}
                <span className={`text-[9px] font-mono ${accent} bg-white/5 px-1 py-0.5 rounded`}>Lv.{level}</span>
              </div>
              <div className="text-[9px] text-zinc-500">
                效率 <span className={`${accent} font-bold`}>{Math.round(speedBonus * 100)}%</span>
                <span className="mx-1 text-zinc-700">·</span>
                队列 <span className="text-zinc-300 font-bold">{fac.queue.length}/{capacity}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (isMax) return;
              if (upgradeShelterStat(type, unitIndex)) {
                addLog(`${fac.name} ${units.length > 1 ? `${unitIndex + 1}号 ` : ''}升级至 Lv.${level + 1}`, 'logistics');
                showToast(`${fac.name}升级成功！效率与队列容量提升。`, 'success');
              } else {
                showToast('所需资源不足，无法升级！', 'error');
              }
            }}
            disabled={isMax || !canAffordUpgrade}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
              isMax
                ? 'bg-zinc-900/40 text-zinc-600 border border-zinc-800/60 cursor-default'
                : canAffordUpgrade
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 active:scale-95 cursor-pointer'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            <TrendingUp className="w-2.5 h-2.5" />
            {isMax ? (
              <span>已满级</span>
            ) : (
              <>
                <span>升级</span>
                {nextConfig && Object.entries(nextConfig.cost).map(([itemId, qty]) => (
                  <React.Fragment key={itemId}>
                    <GameIcon type="item" id={itemId} className="w-3 h-3" title={itemId} />
                    <span>{qty}</span>
                  </React.Fragment>
                ))}
              </>
            )}
          </button>
        </div>

        {/* ── 配方入队 ── */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">加入配方队列</div>
          <div className="flex gap-1.5">
            <select
              value={selectedRecipe}
              onChange={(e) => setSelectedRecipe(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700/60 text-zinc-300 px-2 py-1.5 rounded-lg outline-none text-[10px] focus:border-zinc-500 transition-colors"
            >
              <option value="">— 选择配方 —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {getRecipeDisplayName(r)} ({getActualDuration(r.id, level)}s)
                </option>
              ))}
            </select>
            <button
              onClick={handleEnqueue}
              disabled={!selectedRecipe}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all ${
                !selectedRecipe
                  ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                  : `bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 active:scale-95 cursor-pointer ${accent}`
              }`}
            >
              <Plus className="w-3 h-3" />
              入队
            </button>
          </div>
        </div>

        {/* ── 队列列表 ── */}
        <div className="space-y-1">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            执行队列（FIFO）
          </div>
          {fac.queue.length === 0 ? (
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-700 italic py-1">
              <ChevronRight className="w-3 h-3" />
              队列为空，请入队配方
            </div>
          ) : (
            <div className="space-y-1">
              {fac.queue.map((recipeId, idx) => {
                const r = AUTO_RECIPES[recipeId];
                if (!r) return null;
                const isHead = idx === 0;
                const headPaused = isHead && isPaused;
                return (
                  <div
                    key={`${recipeId}_${idx}`}
                    className={`rounded-lg border px-2 py-1.5 flex items-center gap-2 ${
                      isHead
                        ? headPaused
                          ? 'bg-rose-950/30 border-rose-700/40'
                          : 'bg-zinc-800/60 border-zinc-700/50'
                        : 'bg-zinc-900/40 border-zinc-800/60'
                    }`}
                  >
                    <GameIcon type="item" id={Object.keys(r.reward)[0] || recipeId} className="w-3.5 h-3.5 flex-shrink-0" title={getRecipeDisplayName(r)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold truncate ${isHead ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          {getRecipeDisplayName(r)}
                        </span>
                        {isHead ? (
                          headPaused ? (
                            <span className="text-[8px] font-bold text-rose-400 bg-rose-900/30 px-1 py-0.5 rounded">材料不足 · 暂停</span>
                          ) : fac.timeLeft > 0 ? (
                            <span className={`text-[8px] font-mono ${accent}`}>{fac.timeLeft}s</span>
                          ) : (
                            <span className="text-[8px] text-zinc-500">等待启动</span>
                          )
                        ) : (
                          <span className="text-[8px] text-zinc-600">排队 #{idx}</span>
                        )}
                      </div>
                      {isHead && fac.timeLeft > 0 && (
                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (removeQueueEntry(type, unitIndex, idx)) {
                          showToast(isHead && fac.timeLeft > 0 ? '已取消，在制原料已退还。' : '已移出队列。', 'info');
                        }
                      }}
                      className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                      title="移出队列"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 状态与控制 ── */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 text-[9px] font-bold px-2 py-1.5 rounded-md text-center ${
            fac.active === false
              ? 'bg-zinc-800/50 text-zinc-500'
              : fac.queue.length === 0
              ? 'bg-zinc-800/50 text-zinc-500'
              : isPaused
              ? 'bg-rose-900/20 text-rose-400 animate-pulse'
              : fac.timeLeft > 0
              ? `${runningBg} text-zinc-200`
              : 'bg-emerald-900/20 text-emerald-400'
          }`}>
            {fac.active === false
              ? '产线关闭'
              : fac.queue.length === 0
              ? '待机 · 等待配方'
              : isPaused
              ? '材料不足 · 自动暂停'
              : fac.timeLeft > 0
              ? `${headRecipe ? getRecipeDisplayName(headRecipe) : '加工'}中 ${fac.timeLeft}s`
              : '正在启动…'}
          </div>
          <button
            onClick={() => {
              const next = fac.active === false;
              setFacilityActive(type, unitIndex, next);
              showToast(next ? `${fac.name}已启动，纯自动运转。` : `${fac.name}已关停。`, 'info');
            }}
            disabled={fac.queue.length === 0}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
              fac.queue.length === 0
                ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                : fac.active === false
                ? `${iconBg} ${accent} border ${iconBorder} hover:brightness-125 active:scale-95 cursor-pointer`
                : 'bg-rose-500/10 text-rose-400 border border-rose-600/30 hover:bg-rose-500/20 active:scale-95 cursor-pointer'
            }`}
          >
            {fac.active === false ? (
              <><Play className="w-3 h-3" />启动</>
            ) : (
              <><Square className="w-3 h-3" />关停</>
            )}
          </button>
        </div>

        {/* ── 当前队首配方详情 ── */}
        {headRecipe && (
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/50">
            <RecipeRow label="消耗" items={headRecipe.cost} getInvQty={getInvQty} accent="rose" />
            <RecipeRow label="产出" items={headRecipe.reward} getInvQty={getInvQty} accent="emerald" />
            <div className="flex items-center gap-1 text-[8px] text-zinc-600 pt-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              {Object.entries(headRecipe.reward).map(([id, qty]) => (
                <span key={id} className="flex items-center gap-0.5">
                  <GameIcon type="item" id={id} className="w-2.5 h-2.5" />
                  {(qty * (cycleTime > 0 ? 60 / cycleTime : 0)).toFixed(1)}/min
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 设施类型区块：多台并行 + 扩建入口
// ─────────────────────────────────────────────
function FacilityTypeSection({
  type,
  theme,
  icon,
}: {
  type: FacilityType;
  theme: FacilityTheme;
  icon: React.ReactNode;
}) {
  const { state, expandFacility, addLog } = useGame();
  const { showToast } = useToast();
  const { accent, iconBg } = theme;
  const units = state.shelter.facilities[type] || [];
  const cfg = FACILITY_EXPANSION[type];
  const getInvQty = (id: string) => state.inventory[id] || 0;

  const canExpand = units.length < cfg.maxUnits;
  const cost = canExpand ? cfg.costs[units.length - 1] : null;
  const canAfford = cost ? Object.entries(cost).every(([itemId, qty]) => getInvQty(itemId) >= qty) : false;

  return (
    <div className="space-y-3">
      {units.map((_, unitIndex) => (
        <FacilityUnitCard
          key={unitIndex}
          type={type}
          unitIndex={unitIndex}
          theme={theme}
          icon={icon}
        />
      ))}

      {/* 扩建：新增一台并行设施 */}
      <button
        onClick={() => {
          if (!canExpand) return;
          if (expandFacility(type)) {
            addLog(`${units[0]?.name || type} 扩建完成，新增 ${units.length + 1} 号设施。`, 'logistics');
            showToast('扩建成功！新增一台并行设施。', 'success');
          } else {
            showToast('扩建失败：资源不足。', 'error');
          }
        }}
        disabled={!canExpand || !canAfford}
        className={`w-full py-2 rounded-xl border border-dashed text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 ${
          !canExpand
            ? 'border-zinc-800 text-zinc-700 cursor-default'
            : canAfford
              ? `${iconBg} ${accent} border-zinc-700 hover:brightness-125 active:scale-[0.99] cursor-pointer`
              : 'border-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        <Plus className="w-3 h-3" />
        {canExpand ? (
          <>
            扩建 {units.length + 1} 号设施（并行运转）
            {cost && Object.entries(cost).map(([itemId, qty]) => (
              <React.Fragment key={itemId}>
                <GameIcon type="item" id={itemId} className="w-3 h-3" title={itemId} />
                <span>{qty}</span>
              </React.Fragment>
            ))}
          </>
        ) : (
          '已达扩建上限'
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 魔导冶炼炉（类型区块）
// ─────────────────────────────────────────────
export const SmelterCard: React.FC = () => (
  <FacilityTypeSection
    type="smelter"
    icon={<Flame className="w-4 h-4 text-amber-400" />}
    theme={{
      accent: 'text-amber-400',
      glow: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400',
      barClass: 'bg-gradient-to-r from-amber-500 to-orange-400',
      runningBg: 'bg-amber-900/20',
      iconBg: 'bg-amber-500/10',
      iconBorder: 'border-amber-600/30'
    }}
  />
);

// ─────────────────────────────────────────────
// 微型芯片组装台（类型区块）
// ─────────────────────────────────────────────
export const AssemblerCard: React.FC = () => (
  <FacilityTypeSection
    type="assembler"
    icon={<Wrench className="w-4 h-4 text-purple-400" />}
    theme={{
      accent: 'text-purple-400',
      glow: 'bg-gradient-to-r from-purple-600 via-violet-500 to-purple-400',
      barClass: 'bg-gradient-to-r from-purple-500 to-violet-400',
      runningBg: 'bg-purple-900/20',
      iconBg: 'bg-purple-500/10',
      iconBorder: 'border-purple-600/30'
    }}
  />
);
