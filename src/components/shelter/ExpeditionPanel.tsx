import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../../data/expeditionLocations';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS } from '../../data/heroes';
import { ITEMS_CONFIG } from '../../data/items';
import { getHeroName, getInvQty } from '../../utils/gameUtils';
import { resolveDutyBonuses } from '../../state/duty';
import { useToast } from '../ToastSystem';
import DutyAssignModal from './DutyAssignModal';
import { Compass, Rocket, Clock, LogOut, Search, Info, Play, ShieldAlert } from 'lucide-react';

// 挂机探索远征面板：派遣/召回探索员、地点选择、拾荒结算倒计时与战利品预览。
// 从 ShelterTab 拆分（结构重构，无行为变化）；自足 useGame/useToast。
const ExpeditionPanel: React.FC = () => {
  const { state, assignHeroToDuty, addLog } = useGame();
  const { showToast } = useToast();

  // 本地每秒 tick，用于平滑更新远征计时和倒计时
  const [nowTime, setNowTime] = useState(Date.now());

  // 状态绑定：挂机远征的选择
  const [selectedExpExplorerId, setSelectedExpExplorerId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(Object.keys(EXPEDITION_LOCATIONS)[0] || 'radar_station');
  const [showExplorerPicker, setShowExplorerPicker] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 英雄的职阶/阵营（ADR-0018：远征门槛迁移为 heroClass/faction）
  const getHeroClassLabel = (heroId: string): string =>
    HEROES_CONFIG[heroId] ? HERO_CLASS_LABELS[HEROES_CONFIG[heroId].heroClass] : '';
  const getHeroFactionLabel = (heroId: string): string =>
    HEROES_CONFIG[heroId] ? HERO_FACTION_LABELS[HEROES_CONFIG[heroId].faction] : '';

  // 探索员与地点的职阶/阵营门槛匹配校验（ADR-0018）
  const checkRequirementUnmatch = (locationId: string): boolean => {
    const loc = EXPEDITION_LOCATIONS[locationId as keyof typeof EXPEDITION_LOCATIONS];
    const heroCfg = selectedExpExplorerId ? HEROES_CONFIG[selectedExpExplorerId] : null;
    const classUnmatch = loc?.requiredHeroClass && heroCfg && heroCfg.heroClass !== loc.requiredHeroClass;
    const factionUnmatch = loc?.requiredFaction && heroCfg && heroCfg.faction !== loc.requiredFaction;
    return !!(classUnmatch || factionUnmatch);
  };

  // 4. 挂机探索状态与数据计算
  const exp = state.shelter.expedition;
  const currentExplorer = exp.locationId && state.shelter.assignedExplorerId
    ? state.heroes[state.shelter.assignedExplorerId]
    : null;
  const expLocation = exp.locationId
    ? EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS]
    : null;

  // 远征速度与间隔计算（角色效率加成已随被动系统退役，仅由地点配置决定）
  const expInterval = expLocation ? Math.max(30, Math.floor(expLocation.scavengeInterval)) : 300;

  // 挂机远征实时计算
  let expElapsedTime = 0;
  let expCountdown = 0;
  if (exp.locationId && exp.startTime) {
    expElapsedTime = Math.floor((nowTime - exp.startTime) / 1000);
    const baseTime = exp.lastScavengeTime || exp.startTime;
    const timePassed = nowTime - baseTime;
    expCountdown = Math.max(0, Math.ceil((expInterval * 1000 - timePassed) / 1000));
  }

  // 开始派遣
  const handleStartExpedition = () => {
    if (!selectedExpExplorerId) {
      showToast('请先指派一名英雄作为探索员！', 'warning');
      return;
    }
    const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
    if (!loc) return;

    // 检查英雄是否已获得（heroes 中仅含已获得的英雄，ADR-0013）
    const explorer = state.heroes[selectedExpExplorerId];
    if (!explorer) {
      showToast('派遣失败！未找到该英雄。', 'error');
      return;
    }
    // 远征门槛校验已内化到 assignHeroToDuty（ADR-0018），UI 仅做视觉提示

    const success = assignHeroToDuty(selectedExpExplorerId, { type: 'explorer', targetId: selectedLocationId });
    if (success) {
      addLog(`探索员 ${getHeroName(selectedExpExplorerId) || '英雄'} 前往 ${loc.name} 开始挂机远征派遣`, 'logistics');
      showToast(`英雄 ${getHeroName(selectedExpExplorerId)} 已带足口粮前往 ${loc.name} 挂机派遣！`, 'success');
    } else {
      showToast('派遣失败，请检查人员状态！', 'error');
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        <Compass className="w-4 h-4 text-cyan-400" />
        挂机探索远征
      </h2>

      {exp.locationId && currentExplorer && expLocation ? (
        /* 已派遣状态 */
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
          <div className="h-0.5 w-full bg-cyan-500/30" />
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    {expLocation.name}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    探索员: <strong className="text-zinc-200 font-bold">{getHeroName(state.shelter.assignedExplorerId || '')}</strong>
                    <span className="ml-1">[{getHeroClassLabel(state.shelter.assignedExplorerId || '')} · {getHeroFactionLabel(state.shelter.assignedExplorerId || '')}]</span>
                  </div>
                  {(() => {
                    // 探索员加成（作用域化）：拾荒间隔缩短 / 稀有掉落加成
                    const eb = resolveDutyBonuses(HEROES_CONFIG[state.shelter.assignedExplorerId || '']?.dutyMeta, { role: 'expedition' });
                    const parts: string[] = [];
                    if (eb.intervalReduction > 0) parts.push(`拾荒间隔 -${Math.round(eb.intervalReduction * 100)}%`);
                    if (eb.lootChanceBonus > 0) parts.push(`稀有掉落 +${Math.round(eb.lootChanceBonus * 100)}%`);
                    if (parts.length === 0) return null;
                    return <div className="text-[9px] text-cyan-300/80 mt-0.5">探索员加成：{parts.join(' · ')}</div>;
                  })()}
                </div>
              </div>
              <button
                onClick={() => {
                  const explorerName = getHeroName(state.shelter.assignedExplorerId || '');
                  const locName = expLocation?.name || '未知区域';
                  if (assignHeroToDuty(state.shelter.assignedExplorerId || '', null)) {
                    addLog(`远征探索员 ${explorerName} 已从 ${locName} 安全召回`, 'logistics');
                    showToast('远征探索员已成功安全召回，拾荒所得物资已全部存入避难所储藏箱！', 'success');
                  } else {
                    showToast('召回失败，请稍后重试！', 'error');
                  }
                }}
                className="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> 召回
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-cyan-900/30 text-[10px]">
              <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50">
                <div className="text-zinc-500 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  已累积探索时间
                </div>
                <div className="text-zinc-200 font-mono font-bold mt-1 text-xs">
                  {(() => {
                    const h = Math.floor(expElapsedTime / 3600);
                    const m = Math.floor((expElapsedTime % 3600) / 60);
                    const s = expElapsedTime % 60;
                    return `${h > 0 ? `${h}时` : ''}${m}分${s}秒`;
                  })()}
                </div>
              </div>

              <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50">
                <div className="text-zinc-500 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                  距离下次拾荒结算
                </div>
                <div className="text-cyan-400 font-mono font-bold mt-1 text-xs animate-pulse">
                  {expCountdown} 秒
                </div>
              </div>
            </div>

            {/* 战利品掉落表 */}
            <div className="mt-3.5 text-[9px] text-zinc-500 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
              <span className="font-bold text-zinc-400 block mb-1 flex items-center gap-1"><Search className="w-3 h-3" /> 本地可能获取的废土战利品：</span>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {expLocation.lootTable.map(loot => (
                  <span key={loot.itemId} className="text-zinc-400">
                    • {ITEMS_CONFIG[loot.itemId]?.name} (几率:{Math.round(loot.chance * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* 未派遣状态 - 允许派遣配置 */
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
          <div className="h-0.5 w-full bg-cyan-500/30" />
          <div className="p-4 space-y-3">
            {/* 标题栏：探索员选择 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-100">远征派遣</div>
                  <div className="text-[9px] text-zinc-500">
                    {selectedExpExplorerId
                      ? `探索员: ${getHeroName(selectedExpExplorerId)} [${getHeroClassLabel(selectedExpExplorerId)} · ${getHeroFactionLabel(selectedExpExplorerId)}]`
                      : '未指派探索员'}
                  </div>
                </div>
              </div>
              {selectedExpExplorerId ? (
                <button
                  onClick={() => setShowExplorerPicker(true)}
                  className="text-[9px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                >
                  更换
                </button>
              ) : (
                <button
                  onClick={() => setShowExplorerPicker(true)}
                  className="text-[9px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                >
                  派遣
                </button>
              )}
            </div>

            {/* 地点选择 */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2.5">
              {Object.entries(EXPEDITION_LOCATIONS).map(([key, loc]) => {
                const isSelected = selectedLocationId === key;

                // 门槛校验（ADR-0018：heroClass/faction）
                const requirementUnmatch = checkRequirementUnmatch(key);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedLocationId(key);
                    }}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/15 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                        : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-zinc-200 text-xs">{loc.name}</span>
                      {(loc.requiredHeroClass || loc.requiredFaction) && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          requirementUnmatch
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          需【{loc.requiredHeroClass ? HERO_CLASS_LABELS[loc.requiredHeroClass] : ''}{loc.requiredFaction ? `/${HERO_FACTION_LABELS[loc.requiredFaction]}` : ''}】
                        </span>
                      )}
                    </div>

                    {/* 地点拾荒详情 */}
                    <div className="mt-1.5 text-[9px] text-zinc-500 space-y-0.5">
                      <div>基础提炼时间: {loc.scavengeInterval} 秒/次</div>
                      <div>可能拾得: {loc.lootTable.map(l => ITEMS_CONFIG[l.itemId]?.name).join(', ')}</div>
                    </div>

                    {/* 警告信息 */}
                    {requirementUnmatch && (
                      <div className="mt-2 text-[9px] text-rose-500 font-semibold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-rose-500 animate-bounce" />
                        指派探索员职阶/阵营不匹配，无法出发！
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* 口粮消耗提示 */}
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 text-[10px] space-y-1.5">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-zinc-500" />
                派遣口粮消耗给养：
              </span>
              <span className={getInvQty(state.inventory, 'ration') >= (EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                {(EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) > 0
                  ? `${getInvQty(state.inventory, 'ration') >= (EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) ? '口粮充足' : '口粮不足'} (持有: ${getInvQty(state.inventory, 'ration')}/${EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0})`
                  : '该地点无需口粮'}
              </span>
            </div>
            <p className="text-[9px] text-zinc-500 leading-normal">
              荒野深处充满核辐射与变异威胁，探索员出发前必须消耗压缩口粮用于补给。如果储藏箱口粮不足，将无法开始派遣。
            </p>
          </div>

          {/* 开始派遣按钮 */}
          {(() => {
            const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
            const requirementUnmatch = checkRequirementUnmatch(selectedLocationId);
            const rationCost = loc?.rationCost ?? 0;
            const rationShortage = rationCost > 0 && getInvQty(state.inventory, 'ration') < rationCost;
            const isDisabled = !selectedExpExplorerId || requirementUnmatch || rationShortage;

            return (
              <button
                onClick={handleStartExpedition}
                disabled={isDisabled}
                className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs ${
                  isDisabled
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer shadow-md'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                开始挂机远征派遣
              </button>
            );
          })()}
          </div>
        </div>
      )}

      {/* 远征探索员选择弹窗 */}
      <DutyAssignModal
        isOpen={showExplorerPicker}
        title="指派远征探索员"
        heroes={state.heroes}
        party={state.party}
        onSelect={(id) => {
          setSelectedExpExplorerId(id);
          setShowExplorerPicker(false);
        }}
        onClose={() => setShowExplorerPicker(false)}
      />
    </section>
  );
};

export default ExpeditionPanel;
