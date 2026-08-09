import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { ITEMS_CONFIG } from '../../data/items';
import { SHELTER_UPGRADES } from '../../data/shelterUpgrades';
import { FACILITIES_CONFIG, isFacilityType, type FacilityType, type FacilityConfig } from '../../data/facilities';
import type { UpgradeLevel } from '../../types/config';
import { useToast } from '../ToastSystem';
import GameIcon from '../GameIcon';
import ShelterTabBar from './ShelterTabBar';
import type { ShelterTabId } from './constants';
import { Settings, Cpu } from 'lucide-react';
import { getInvQty, formatDuration } from '../../utils/gameUtils';
import {
  getShelterUpgradeLevel,
  getShelterUpgradeKey,
  getFacilityExpansionKey,
  isUnlocked,
  type UpgradeStatType
} from '../../state/facility';
import { FacilitySection } from './FacilityCard';
import type { UpgradeInProgress } from '../../types/game';
import DreamLeakAlertPanel from './DreamLeakAlertPanel';
import GreenhousePanel from './GreenhousePanel';
import ExpeditionPanel from './ExpeditionPanel';

// 基建升级配色：全站统一一套 cyan 主题（ADR-0018 后不再按升级项区分）
const UPGRADE_THEME: { iconBg: string; iconBorder: string; buttonClass: (isMax: boolean, canAfford: boolean) => string } = {
  iconBg: 'bg-cyan-950/50',
  iconBorder: 'border-cyan-500/30',
  buttonClass: (isMax, canAfford) => isMax ? 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/50 cursor-default'
    : canAfford ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 cursor-pointer'
    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
};

// 单实例基建升级项（含迁移自工坊的温室智能扩展坞）；产线设施在下方独立区块
const SINGLE_UPGRADE_IDS: UpgradeStatType[] = ['battery', 'generator', 'recycler', 'greenhouse_dock'];

// 升级卡/扩建卡统一外壳：圆角卡片 + 顶部青色条纹 + 内边距（视觉上同构，避免扩建被误认为普通按钮）
function UpgradeCardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
      <div className="h-0.5 w-full bg-cyan-500/30" />
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// 施工中进度条区（升级/扩建共用）：进度条 + 百分比 + 剩余时间
function InProgressBlock({ label, progress, remainingSeconds }: { label: string; progress: number; remainingSeconds: number }) {
  return (
    <div className="flex flex-col items-end gap-1 w-[104px] flex-shrink-0">
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[8px] font-mono text-cyan-400">{label} {progress}%</span>
      <span className="text-[8px] text-zinc-500">剩余 {formatDuration(remainingSeconds)}</span>
    </div>
  );
}

// 升级完成提示（key → 名称；expand_ 前缀为扩建）；配置源分派：设备读 FACILITIES_CONFIG、全局读 SHELTER_UPGRADES
const upgradeNameForKey = (key: string): string | null => {
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length);
    return isFacilityType(type) ? FACILITIES_CONFIG[type].name : null;
  }
  const m = /^(.*)_(\d+)$/.exec(key);
  const id = m && isFacilityType(m[1]) ? m[1] : key;
  return isFacilityType(id) ? FACILITIES_CONFIG[id].name : (SHELTER_UPGRADES[id]?.name ?? null);
};

// 升级卡配置源：设施类型读设备配置表，全局类型读 SHELTER_UPGRADES（两表字段兼容 name/maxLevel/levels/effectLabel/id）
const getUpgradeCardConfig = (
  statType: UpgradeStatType
): { id: string; name: string; maxLevel: number; effectLabel: string; levels: UpgradeLevel[] } | undefined =>
  isFacilityType(statType) ? FACILITIES_CONFIG[statType] : SHELTER_UPGRADES[statType];

// 设施当前等级效率加成（读设备配置表累计 effectValue；Lv1 = 0 → 100%）
const getFacilityEffBonus = (statType: UpgradeStatType, level: number): number =>
  isFacilityType(statType) ? (FACILITIES_CONFIG[statType]?.levels.find(l => l.level === level)?.effectValue ?? 0) : 0;

// ─────────────────────────────────────────────
// 升级卡：当前等级/效果/下一级消耗 + 升级耗时 + 升级中进度条（时间戳驱动）
// ─────────────────────────────────────────────
function UpgradeCard({ statType, unitIndex = 0 }: { statType: UpgradeStatType; unitIndex?: number }) {
  const { state, upgradeShelterStat, addLog } = useGame();
  const { showToast } = useToast();
  const upgrade = getUpgradeCardConfig(statType);
  if (!upgrade) return null;

  const isFacility = isFacilityType(statType);
  const currentLevel = getShelterUpgradeLevel(state, statType, unitIndex);
  const isMax = currentLevel >= upgrade.maxLevel;
  const currentConfig = upgrade.levels.find(l => l.level === currentLevel);
  const nextConfig = upgrade.levels.find(l => l.level === currentLevel + 1);
  const key = getShelterUpgradeKey(statType, unitIndex);
  const pending: UpgradeInProgress | undefined = state.shelter.upgrades?.[key];
  const duration = nextConfig?.duration ?? 0;
  const canAfford = nextConfig ? Object.entries(nextConfig.cost).every(([item, qty]) => getInvQty(state.inventory, item) >= qty) : false;

  // 升级中进度（时间戳驱动）：(now - startTime) / 目标耗时
  const now = Date.now();
  const progress = pending && duration > 0
    ? Math.min(100, Math.floor(((now - pending.startTime) / (duration * 1000)) * 100))
    : 0;
  const remainingSeconds = pending && duration > 0
    ? Math.max(0, Math.ceil(duration - (now - pending.startTime) / 1000))
    : 0;

  const unitLabel = isFacility && unitIndex > 0 ? ` ${unitIndex + 1}号` : '';

  return (
    <UpgradeCardFrame>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${UPGRADE_THEME.iconBg} border ${UPGRADE_THEME.iconBorder} flex items-center justify-center`}>
            <GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              {upgrade.name}{unitLabel}
              <span className="text-[9px] font-mono text-cyan-400 bg-white/5 px-1 py-0.5 rounded">Lv.{currentLevel}</span>
              {isFacility && (
                <span className="text-[9px] text-zinc-500">效率 {Math.floor((1 + getFacilityEffBonus(statType, currentLevel)) * 100)}%</span>
              )}
            </div>
            <div className="text-[9px] text-zinc-500">
              {upgrade.effectLabel}：<span className={currentLevel > 0 ? 'text-zinc-200 font-bold' : 'text-zinc-500'}>{currentConfig ? currentConfig.effectText : '已停机'}</span>
            </div>
          </div>
        </div>

        {pending ? (
          <InProgressBlock label="升级中" progress={progress} remainingSeconds={remainingSeconds} />
        ) : (
          <button
            onClick={() => {
              if (upgradeShelterStat(statType, unitIndex)) {
                addLog(`开始升级 ${upgrade.name}${unitLabel} 至 Lv.${currentLevel + 1}`, 'logistics');
                showToast(`已开始升级 ${upgrade.name}${unitLabel}，预计耗时 ${formatDuration(duration)}。`, 'success');
              } else {
                showToast('所需资源不足，无法开始升级！', 'error');
              }
            }}
            disabled={isMax || !canAfford}
            className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${UPGRADE_THEME.buttonClass(isMax, canAfford)}`}
          >
            {isMax ? (
              <>
                <span className="font-extrabold text-[11px] text-zinc-500">已满级</span>
                <span className="block text-[8px] font-normal text-zinc-600 mt-0.5">MAX</span>
              </>
            ) : (
              <>
                <span className="font-extrabold text-[11px]">升级</span>
                <span className="block text-[8px] font-normal text-zinc-500 mt-0.5">耗时 {formatDuration(duration)}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
        <div className="flex justify-between"><span>当前效果</span><span className="text-zinc-200 font-bold">{currentConfig ? currentConfig.effectText : '已停机'}</span></div>
        {!isMax && nextConfig && <div className="flex justify-between mt-1"><span>下一级</span><span className="text-zinc-300 font-bold">{nextConfig.effectText}</span></div>}
        {!isMax && nextConfig && (
          <div className="flex justify-between mt-1">
            <span>下一级消耗</span>
            <span className="text-amber-400">{Object.entries(nextConfig.cost).map(([item, qty]) => `${ITEMS_CONFIG[item]?.name || item}×${qty}`).join(' · ') || '—'}</span>
          </div>
        )}
      </div>
    </UpgradeCardFrame>
  );
}

// ─────────────────────────────────────────────
// 产线设施区块：每台设施升级卡 + 扩建卡（与升级卡同构）
// ─────────────────────────────────────────────
function FacilityUpgradeSection({ type }: { type: FacilityType }) {
  const { state } = useGame();
  const units = state.shelter.facilities[type] || [];
  const upgrade = FACILITIES_CONFIG[type];
  if (!upgrade) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 pt-1">
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        {upgrade.name}
        {units.length > 1 && <span className="text-[9px] font-mono text-cyan-400 bg-white/5 px-1 py-0.5 rounded">×{units.length} 台并行</span>}
        <span className="text-[9px] text-zinc-600 font-normal">（任务管理见「产线」页签）</span>
      </h3>

      {units.map((_, unitIndex) => (
        <UpgradeCard key={unitIndex} statType={type} unitIndex={unitIndex} />
      ))}

      <ExpansionCard type={type} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 扩建卡：新增一台并行设施（耗时施工），与升级卡同构卡片样式
// ─────────────────────────────────────────────
function ExpansionCard({ type }: { type: FacilityType }) {
  const { state, expandFacility, addLog } = useGame();
  const { showToast } = useToast();
  const units = state.shelter.facilities[type] || [];
  const cfg = FACILITIES_CONFIG[type]?.expansion;
  const upgrade = FACILITIES_CONFIG[type];
  if (!cfg || !upgrade || units.length === 0) return null;

  const canExpand = units.length < cfg.maxUnits;
  const cost = canExpand ? cfg.costs[units.length - 1] : null;
  const duration = canExpand ? cfg.durations[units.length - 1] : 0;
  const canAfford = cost ? Object.entries(cost).every(([itemId, qty]) => getInvQty(state.inventory, itemId) >= qty) : false;
  const expKey = getFacilityExpansionKey(type);
  const pending = state.shelter.upgrades?.[expKey] ?? null;

  const now = Date.now();
  const progress = pending && duration > 0
    ? Math.min(100, Math.floor(((now - pending.startTime) / (duration * 1000)) * 100))
    : 0;
  const remainingSeconds = pending && duration > 0
    ? Math.max(0, Math.ceil(duration - (now - pending.startTime) / 1000))
    : 0;

  return (
    <UpgradeCardFrame>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${UPGRADE_THEME.iconBg} border ${UPGRADE_THEME.iconBorder} flex items-center justify-center`}>
            <GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              {upgrade.name} 扩建
              <span className="text-[9px] font-mono text-cyan-400 bg-white/5 px-1 py-0.5 rounded">×{units.length} 台</span>
            </div>
            <div className="text-[9px] text-zinc-500">
              当前规模：<span className="text-zinc-200 font-bold">{units.length} 台并行运转</span>
            </div>
          </div>
        </div>

        {pending ? (
          <InProgressBlock label="扩建中" progress={progress} remainingSeconds={remainingSeconds} />
        ) : (
          <button
            onClick={() => {
              if (!canExpand) return;
              if (expandFacility(type)) {
                addLog(`开始扩建 ${upgrade.name} 第 ${units.length + 1} 号设施`, 'logistics');
                showToast(`已开始扩建 ${upgrade.name} ${units.length + 1} 号设施，预计耗时 ${formatDuration(duration)}。`, 'success');
              } else {
                showToast('扩建失败：资源不足。', 'error');
              }
            }}
            disabled={!canExpand || !canAfford}
            className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${UPGRADE_THEME.buttonClass(!canExpand, canAfford)}`}
          >
            {!canExpand ? (
              <>
                <span className="font-extrabold text-[11px] text-zinc-500">已达上限</span>
                <span className="block text-[8px] font-normal text-zinc-600 mt-0.5">MAX</span>
              </>
            ) : (
              <>
                <span className="font-extrabold text-[11px]">扩建</span>
                <span className="block text-[8px] font-normal text-zinc-500 mt-0.5">耗时 {formatDuration(duration)}</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
        <div className="flex justify-between"><span>当前规模</span><span className="text-zinc-200 font-bold">{units.length} 台并行</span></div>
        {canExpand && cost && (
          <>
            <div className="flex justify-between mt-1">
              <span>下一台消耗</span>
              <span className="text-amber-400">{Object.entries(cost).map(([item, qty]) => `${ITEMS_CONFIG[item]?.name || item}×${qty}`).join(' · ')}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>预计耗时</span>
              <span className="text-zinc-300 font-bold">{formatDuration(duration)}</span>
            </div>
          </>
        )}
      </div>
    </UpgradeCardFrame>
  );
}

// 后勤页容器：tab 导航 + 基建（全部升级整合）/产线/温室/远征面板（拆分为独立组件）
const ShelterTab: React.FC = () => {
  const { state } = useGame();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ShelterTabId>('base');

  // 升级完成提示：施工条目从 upgrades 中消失即完成（在线由 tick 应用，此处仅弹 toast）
  const prevUpgradesRef = useRef<Record<string, UpgradeInProgress>>(state.shelter.upgrades || {});
  useEffect(() => {
    const prev = prevUpgradesRef.current;
    const next = state.shelter.upgrades || {};
    prevUpgradesRef.current = next;
    for (const key of Object.keys(prev)) {
      if (!next[key]) {
        const name = upgradeNameForKey(key);
        if (name) {
          showToast(key.startsWith('expand_') ? `${name} 扩建完成！` : `${name} 升级完成！`, 'success');
        }
      }
    }
  }, [state.shelter.upgrades, showToast]);

  // 状态计数：温室可收割数 / 产线进行中任务数 / 远征进行中
  const harvestableCount = state.greenhouse.slots.filter(s => s.cropId && s.growthProgress >= 100).length;
  const facilityTaskCount = Object.values(state.shelter.facilities).flat().reduce((sum, f) => sum + (f.recipeId != null ? 1 : 0), 0);
  const expeditionBadge = state.shelter.expedition.locationId ? '进行中' : null;
  const tabCounts: Record<ShelterTabId, string | null> = {
    base: null,
    greenhouse: harvestableCount > 0 ? String(harvestableCount) : null,
    facility: facilityTaskCount > 0 ? String(facilityTaskCount) : null,
    expedition: expeditionBadge,
  };

  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* 梦魇入侵警报控制台（常驻顶部） */}
      <DreamLeakAlertPanel />

      {/* 分 tab 导航 */}
      <ShelterTabBar active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {/* 基建 tab：所有升级/扩建整合于此（含产线设施升级与扩建、温室扩展坞） */}
      {activeTab === 'base' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          避难所基建升级
        </h2>

        <div className="space-y-3">
          {SINGLE_UPGRADE_IDS.filter(id => isUnlocked(state, SHELTER_UPGRADES[id]?.unlockRequirements)).map((id) => (
            <UpgradeCard key={id} statType={id} />
          ))}
        </div>

        <div className="space-y-5 pt-2">
          {(Object.keys(FACILITIES_CONFIG) as FacilityType[])
            .filter(type => isUnlocked(state, (FACILITIES_CONFIG[type] as FacilityConfig).unlockRequirements))
            .map(type => (
              <FacilityUpgradeSection key={type} type={type} />
            ))}
        </div>
      </section>
      )}

      {/* 温室 tab */}
      {activeTab === 'greenhouse' && (
        <GreenhousePanel />
      )}

      {/* 产线 tab：仅任务管理（升级/扩建已整合至基建 tab） */}
      {activeTab === 'facility' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-magic-blue flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Cpu className="w-4 h-4 text-magic-blue" />
          工业生产流水线
        </h2>

        <div className="space-y-4">
          {(Object.keys(FACILITIES_CONFIG) as FacilityType[])
            .filter(type => isUnlocked(state, (FACILITIES_CONFIG[type] as FacilityConfig).unlockRequirements))
            .map(type => (
              <FacilitySection key={type} type={type} />
            ))}
        </div>
      </section>
      )}

      {/* 远征 tab */}
      {activeTab === 'expedition' && (
        <ExpeditionPanel />
      )}
    </div>
  );
};

export default ShelterTab;

