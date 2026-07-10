import React from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { ITEMS_CONFIG } from '../data/items';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { SURVIVORS_CONFIG } from '../data/survivors';
import GameIcon from './GameIcon';
import { Flame, Wrench, Play, Square, ChevronRight, Zap, TrendingUp } from 'lucide-react';

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

// ─────────────────────────────────────────────
// 共用子组件：幸存者选择下拉
// ─────────────────────────────────────────────
function SurvivorSelect({
  value,
  onChange,
  facilityId,
  survivors,
}: {
  value: string;
  onChange: (val: string) => void;
  facilityId: string;
  survivors: Array<{
    id: string;
    name: string;
    role: string;
    bonus: number;
    assignedJobId?: string | null;
    realityLocationId?: string | null;
  }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-300 px-2 py-1.5 rounded-lg outline-none text-[10px] focus:border-zinc-500 transition-colors"
    >
      <option value="">— 无人值守</option>
      {survivors.map((s) => {
        const cfg = SURVIVORS_CONFIG.find((c) => c.id === s.id);
        const statusStr =
          s.assignedJobId === facilityId
            ? '(当前岗位)'
            : s.assignedJobId
            ? `(忙于 ${s.assignedJobId})`
            : '(空闲)';
        const roleLabel =
          s.role === 'farmer' ? '农' : s.role === 'engineer' ? '工程★' : s.role === 'scout' ? '探索' : s.role === 'guard' ? '卫兵' : s.role === 'chemist' ? '药剂师' : '拾荒者';
        return (
          <option key={s.id} value={s.id}>
            {cfg?.emoji || '👤'} {s.name} [{roleLabel}] {statusStr}
          </option>
        );
      })}
    </select>
  );
}

// ─────────────────────────────────────────────
// 魔导冶炼炉
// ─────────────────────────────────────────────
export const SmelterCard: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    assignSurvivorJob,
    setFacilityRecipe,
    setFacilityActive,
    addLog,
  } = useGame();
  const { showToast } = useToast();

  const fac = state.shelter.facilities.smelter;
  if (!fac) return null;

  const level = fac.level || 1;
  const upgrade = SHELTER_UPGRADES.smelter;
  const isMax = level >= upgrade.maxLevel;
  const nextConfig = upgrade.levels.find(l => l.level === level + 1);
  const activeRecipe = fac.activeRecipeId ? AUTO_RECIPES[fac.activeRecipeId] : null;
  const operator = fac.assignedSurvivorId ? state.survivors[fac.assignedSurvivorId] : null;
  const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (level - 1) * 0.1;
  const survivorsList = Object.values(state.survivors).filter((s) => !s.realityLocationId);
  const smelterRecipes = Object.values(AUTO_RECIPES).filter((r) => r.facilityId === 'smelter');
  const getInvQty = (id: string) => state.inventory[id] || 0;
  const canAfford = nextConfig ? Object.entries(nextConfig.cost).every(([itemId, qty]) => getInvQty(itemId) >= qty) : false;

  let hasInputMaterials = true;
  if (activeRecipe) {
    Object.entries(activeRecipe.input).forEach(([id, qty]) => {
      if (getInvQty(id) < qty) hasInputMaterials = false;
    });
  }

  const isRunning = fac.active !== false && !!fac.activeRecipeId;
  const progress = fac.currentProgress || 0;
  const cycleTime = activeRecipe ? Math.max(1, Math.floor(activeRecipe.duration / speedBonus)) : 0;
  const cyclesPerMin = cycleTime > 0 ? 60 / cycleTime : 0;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-900/30 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
      {/* 顶部彩色条纹 */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400" />

      {/* 运行中脉冲指示 */}
      {isRunning && fac.timeLeft > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="text-[9px] text-amber-400 font-mono">运行中</span>
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping shadow-[0_0_6px_#f59e0b]" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* ── 标题栏 ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-600/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                {fac.name}
                <span className="text-[9px] font-mono text-amber-500/80 bg-amber-500/10 px-1 py-0.5 rounded">Lv.{level}</span>
              </div>
              <div className="text-[9px] text-zinc-500">
                效率 <span className="text-amber-400 font-bold">{Math.round(speedBonus * 100)}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (isMax) return;
              if (upgradeShelterStat('smelter')) {
                addLog(`🏭 ${fac.name} 升级至 Lv.${level + 1}`, 'logistics');
                showToast('魔导冶炼炉升级成功！产线效率提升。', 'success');
              } else {
                showToast('所需资源不足，无法升级！', 'error');
              }
            }}
            disabled={isMax || !canAfford}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
              isMax
                ? 'bg-zinc-900/40 text-zinc-600 border border-zinc-800/60 cursor-default'
                : canAfford
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

        {/* ── 主体：三列 ── */}
        <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] gap-3 items-start">
          {/* 操作员 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <span>操作员</span>
            </div>
            <SurvivorSelect
              value={fac.assignedSurvivorId || ''}
              facilityId="smelter"
              survivors={survivorsList}
              onChange={(val) => {
                if (val === '') {
                  if (fac.assignedSurvivorId) {
                    assignSurvivorJob(fac.assignedSurvivorId, null);
                    showToast('冶炼炉已无人值守。', 'info');
                  }
                } else {
                  assignSurvivorJob(val, 'smelter');
                  const name = state.survivors[val]?.name || '幸存者';
                  addLog(`🔩 指派 ${name} 负责 ${fac.name}`, 'logistics');
                  showToast(`指派 ${name} 负责冶炼炉。`, 'success');
                }
              }}
            />
            {operator ? (
              <div className="text-[9px] rounded-md px-1.5 py-1 bg-zinc-800/50 border border-zinc-700/30">
                <div className="text-zinc-300 font-medium">{operator.name}</div>
                {operator.role === 'engineer' ? (
                  <div className="text-amber-400">工程师 +{Math.round(operator.bonus * 100)}%</div>
                ) : (
                  <div className="text-zinc-600">非工程（无加成）</div>
                )}
              </div>
            ) : (
              <div className="text-[9px] text-zinc-700 italic">暂无派驻</div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="h-full bg-zinc-800/60" />

          {/* 配方 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">配方</div>
            <select
              value={fac.activeRecipeId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFacilityRecipe('smelter', val || null);
                showToast(val ? '配方已部署！' : '已清空配方。', 'info');
              }}
              className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-300 px-2 py-1.5 rounded-lg outline-none text-[10px] focus:border-zinc-500 transition-colors"
            >
              <option value="">— 停产待机</option>
              {smelterRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({Math.max(1, Math.floor(r.duration / speedBonus))}s)
                </option>
              ))}
            </select>
            {activeRecipe ? (
              <div className="space-y-1.5">
                <RecipeRow label="消耗" items={activeRecipe.input} getInvQty={getInvQty} accent="rose" />
                <RecipeRow label="产出" items={activeRecipe.output} getInvQty={getInvQty} accent="emerald" />
                <div className="flex items-center gap-1 text-[8px] text-zinc-600 pt-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {Object.entries(activeRecipe.output).map(([id, qty]) => (
                      <span key={id} className="flex items-center gap-0.5">
                        <GameIcon type="item" id={id} className="w-2.5 h-2.5" />
                        {(qty * cyclesPerMin).toFixed(1)}/min
                      </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-700 italic py-1">
                <ChevronRight className="w-3 h-3" />
                请选择配方
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="h-full bg-zinc-800/60" />

          {/* 状态与控制 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">状态</div>
            <div className={`text-[9px] font-bold px-1.5 py-1 rounded-md text-center ${
              fac.active === false
                ? 'bg-zinc-800/50 text-zinc-500'
                : !fac.activeRecipeId
                ? 'bg-zinc-800/50 text-zinc-500'
                : !hasInputMaterials && fac.timeLeft === 0
                ? 'bg-rose-900/20 text-rose-400 animate-pulse'
                : fac.timeLeft > 0
                ? 'bg-amber-900/20 text-amber-400'
                : 'bg-emerald-900/20 text-emerald-400'
            }`}>
              {fac.active === false
                ? '产线关闭'
                : !fac.activeRecipeId
                ? '等待配方'
                : !hasInputMaterials && fac.timeLeft === 0
                ? '材料不足'
                : fac.timeLeft > 0
                ? `提炼中 ${fac.timeLeft}s`
                : '自动循环'}
            </div>

            {/* 进度条 */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  fac.active === false
                    ? 'bg-zinc-700'
                    : !hasInputMaterials && fac.timeLeft === 0
                    ? 'bg-rose-800/50'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_6px_#f59e0b]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              onClick={() => {
                const next = fac.active === false;
                setFacilityActive('smelter', next);
                showToast(next ? '冶炼炉已启动！' : '冶炼炉已关停。', 'info');
              }}
              disabled={!fac.activeRecipeId}
              className={`w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                !fac.activeRecipeId
                  ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                  : fac.active === false
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-600/30 hover:bg-amber-500/20 active:scale-95 cursor-pointer'
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
        </div>

        {/* ── 底部进度条（粗） ── */}
        {isRunning && (
          <div className="space-y-0.5 pt-1 border-t border-zinc-800/50">
            <div className="flex justify-between text-[8px] text-zinc-600">
              <span>生产进度</span>
              <span className="font-mono text-amber-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-orange-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_#f59e0b80]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 微型芯片组装台
// ─────────────────────────────────────────────
export const AssemblerCard: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    assignSurvivorJob,
    setFacilityRecipe,
    setFacilityActive,
    addLog,
  } = useGame();
  const { showToast } = useToast();

  const fac = state.shelter.facilities.assembler;
  if (!fac) return null;

  const level = fac.level || 1;
  const upgrade = SHELTER_UPGRADES.assembler;
  const isMax = level >= upgrade.maxLevel;
  const nextConfig = upgrade.levels.find(l => l.level === level + 1);
  const activeRecipe = fac.activeRecipeId ? AUTO_RECIPES[fac.activeRecipeId] : null;
  const operator = fac.assignedSurvivorId ? state.survivors[fac.assignedSurvivorId] : null;
  const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (level - 1) * 0.1;
  const survivorsList = Object.values(state.survivors).filter((s) => !s.realityLocationId);
  const assemblerRecipes = Object.values(AUTO_RECIPES).filter((r) => r.facilityId === 'assembler');
  const getInvQty = (id: string) => state.inventory[id] || 0;
  const canAfford = nextConfig ? Object.entries(nextConfig.cost).every(([itemId, qty]) => getInvQty(itemId) >= qty) : false;

  let hasInputMaterials = true;
  if (activeRecipe) {
    Object.entries(activeRecipe.input).forEach(([id, qty]) => {
      if (getInvQty(id) < qty) hasInputMaterials = false;
    });
  }

  const isRunning = fac.active !== false && !!fac.activeRecipeId;
  const progress = fac.currentProgress || 0;
  const cycleTime = activeRecipe ? Math.max(1, Math.floor(activeRecipe.duration / speedBonus)) : 0;
  const cyclesPerMin = cycleTime > 0 ? 60 / cycleTime : 0;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-purple-900/30 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
      {/* 顶部彩色条纹 */}
      <div className="h-0.5 w-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-400" />

      {/* 运行中脉冲指示 */}
      {isRunning && fac.timeLeft > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="text-[9px] text-purple-400 font-mono">运行中</span>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping shadow-[0_0_6px_#a855f7]" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* ── 标题栏 ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-600/30 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                {fac.name}
                <span className="text-[9px] font-mono text-purple-500/80 bg-purple-500/10 px-1 py-0.5 rounded">Lv.{level}</span>
              </div>
              <div className="text-[9px] text-zinc-500">
                效率 <span className="text-purple-400 font-bold">{Math.round(speedBonus * 100)}%</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (isMax) return;
              if (upgradeShelterStat('assembler')) {
                addLog(`🏭 ${fac.name} 升级至 Lv.${level + 1}`, 'logistics');
                showToast('微型芯片组装台升级成功！', 'success');
              } else {
                showToast('所需资源不足，无法升级！', 'error');
              }
            }}
            disabled={isMax || !canAfford}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
              isMax
                ? 'bg-zinc-900/40 text-zinc-600 border border-zinc-800/60 cursor-default'
                : canAfford
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

        {/* ── 主体：三列 ── */}
        <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] gap-3 items-start">
          {/* 操作员 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">操作员</div>
            <SurvivorSelect
              value={fac.assignedSurvivorId || ''}
              facilityId="assembler"
              survivors={survivorsList}
              onChange={(val) => {
                if (val === '') {
                  if (fac.assignedSurvivorId) {
                    assignSurvivorJob(fac.assignedSurvivorId, null);
                    showToast('组装台已无人值守。', 'info');
                  }
                } else {
                  assignSurvivorJob(val, 'assembler');
                  const name = state.survivors[val]?.name || '幸存者';
                  addLog(`🔩 指派 ${name} 负责 ${fac.name}`, 'logistics');
                  showToast(`指派 ${name} 负责组装台。`, 'success');
                }
              }}
            />
            {operator ? (
              <div className="text-[9px] rounded-md px-1.5 py-1 bg-zinc-800/50 border border-zinc-700/30">
                <div className="text-zinc-300 font-medium">{operator.name}</div>
                {operator.role === 'engineer' ? (
                  <div className="text-purple-400">工程师 +{Math.round(operator.bonus * 100)}%</div>
                ) : (
                  <div className="text-zinc-600">非工程（无加成）</div>
                )}
              </div>
            ) : (
              <div className="text-[9px] text-zinc-700 italic">暂无派驻</div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="h-full bg-zinc-800/60" />

          {/* 配方 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">配方</div>
            <select
              value={fac.activeRecipeId || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFacilityRecipe('assembler', val || null);
                showToast(val ? '配方已部署！' : '已清空配方。', 'info');
              }}
              className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-300 px-2 py-1.5 rounded-lg outline-none text-[10px] focus:border-zinc-500 transition-colors"
            >
              <option value="">— 停产待机</option>
              {assemblerRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({Math.max(1, Math.floor(r.duration / speedBonus))}s)
                </option>
              ))}
            </select>
            {activeRecipe ? (
              <div className="space-y-1.5">
                <RecipeRow label="消耗" items={activeRecipe.input} getInvQty={getInvQty} accent="rose" />
                <RecipeRow label="产出" items={activeRecipe.output} getInvQty={getInvQty} accent="emerald" />
                <div className="flex items-center gap-1 text-[8px] text-zinc-600 pt-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  {Object.entries(activeRecipe.output).map(([id, qty]) => {
                    const item = ITEMS_CONFIG[id];
                    return (
                      <span key={id} className="flex items-center gap-0.5">
                        <GameIcon type="item" id={id} className="w-2.5 h-2.5" />
                        <span>{item?.name || id} {(qty * cyclesPerMin).toFixed(1)}/min</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[9px] text-zinc-700 italic py-1">
                <ChevronRight className="w-3 h-3" />
                请选择配方
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="h-full bg-zinc-800/60" />

          {/* 状态与控制 */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">状态</div>
            <div className={`text-[9px] font-bold px-1.5 py-1 rounded-md text-center ${
              fac.active === false
                ? 'bg-zinc-800/50 text-zinc-500'
                : !fac.activeRecipeId
                ? 'bg-zinc-800/50 text-zinc-500'
                : !hasInputMaterials && fac.timeLeft === 0
                ? 'bg-rose-900/20 text-rose-400 animate-pulse'
                : fac.timeLeft > 0
                ? 'bg-purple-900/20 text-purple-400'
                : 'bg-emerald-900/20 text-emerald-400'
            }`}>
              {fac.active === false
                ? '产线关闭'
                : !fac.activeRecipeId
                ? '等待配方'
                : !hasInputMaterials && fac.timeLeft === 0
                ? '材料不足'
                : fac.timeLeft > 0
                ? `组装中 ${fac.timeLeft}s`
                : '自动循环'}
            </div>

            {/* 进度条 */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  fac.active === false
                    ? 'bg-zinc-700'
                    : !hasInputMaterials && fac.timeLeft === 0
                    ? 'bg-rose-800/50'
                    : 'bg-gradient-to-r from-purple-500 to-violet-400 shadow-[0_0_6px_#a855f780]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              onClick={() => {
                const next = fac.active === false;
                setFacilityActive('assembler', next);
                showToast(next ? '组装台已启动！' : '组装台已关停。', 'info');
              }}
              disabled={!fac.activeRecipeId}
              className={`w-full py-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                !fac.activeRecipeId
                  ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed'
                  : fac.active === false
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-600/30 hover:bg-purple-500/20 active:scale-95 cursor-pointer'
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
        </div>

        {/* ── 底部进度条（粗） ── */}
        {isRunning && (
          <div className="space-y-0.5 pt-1 border-t border-zinc-800/50">
            <div className="flex justify-between text-[8px] text-zinc-600">
              <span>生产进度</span>
              <span className="font-mono text-purple-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-900/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-violet-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_#a855f780]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
