import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, ChevronRight } from 'lucide-react';
import type { CalculatedEntityStats, StatModifier, StatKey } from '../state/statSystem';
import {
  STAT_META,
  DERIVED_STAT_META,
  aggregateModifiersBySource,
  getStatSourcesByStat,
  getDerivedStatContributions,
  type DerivedStatKey
} from '../state/statSystem';
import { UI_TOKENS } from '../data/uiConstants';

export interface DetailedStatsModalProps {
  isOpen: boolean;
  heroName: string;
  stats: CalculatedEntityStats;
  modifiers?: StatModifier[];
  onClose: () => void;
}

// 21 项可修饰属性 key（按展示顺序：Base 6 + Primary 6 + Special 9）
const STAT_ORDER: StatKey[] = [
  'attack', 'defense', 'maxHp', 'maxMp', 'critRate', 'critDmg',
  'strength', 'constitution', 'agility', 'intelligence', 'willpower', 'transcendence',
  'arcaneBoost', 'arcaneResistance', 'mechanicalLoad', 'mechanicalEvolution',
  'nightmareErosion', 'voidSpirit', 'spiritInspire', 'astralGuidance', 'soulsealDrive'
];

// 6 项派生属性 key（按展示顺序）
const DERIVED_ORDER: DerivedStatKey[] = [
  'critResist', 'damageReduction', 'durationReduction', 'effectReduction', 'cooldownReduction', 'voidSpirit'
];

// 属性配色（参考 EquipmentDetailModal 风格：Base 暖色、Primary 各异、Special 紫系、Derived 青绿系）
const STAT_COLOR: Record<string, string> = {
  // Base
  attack: 'text-amber-300', defense: 'text-sky-300', maxHp: 'text-rose-300', maxMp: 'text-violet-300',
  critRate: 'text-orange-300', critDmg: 'text-orange-300',
  // Primary
  strength: 'text-amber-300', constitution: 'text-rose-300', agility: 'text-purple-300',
  intelligence: 'text-sky-300', willpower: 'text-emerald-300', transcendence: 'text-fuchsia-300',
  // Special
  arcaneBoost: 'text-violet-300', arcaneResistance: 'text-violet-300',
  mechanicalLoad: 'text-amber-300', mechanicalEvolution: 'text-amber-300',
  nightmareErosion: 'text-rose-300', voidSpirit: 'text-teal-300',
  spiritInspire: 'text-emerald-300', astralGuidance: 'text-indigo-300', soulsealDrive: 'text-fuchsia-300',
};
const DERIVED_COLOR: Record<string, string> = {
  critResist: 'text-sky-300', damageReduction: 'text-emerald-300',
  durationReduction: 'text-emerald-300', effectReduction: 'text-emerald-300',
  cooldownReduction: 'text-fuchsia-300', voidSpirit: 'text-teal-300',
};

// 获取某属性当前总值（从 CalculatedEntityStats 中读取）
const getStatValue = (stats: CalculatedEntityStats, stat: StatKey): { value: number; isPercent: boolean } => {
  const meta = STAT_META[stat];
  const { primaryAttributes: primary, specialAttributes: special, ...base } = stats;
  if (stat in primary) return { value: primary[stat as keyof typeof primary], isPercent: !!meta.percentDisplay };
  if (stat in special) return { value: special[stat as keyof typeof special], isPercent: !!meta.percentDisplay };
  return { value: base[stat as keyof typeof base], isPercent: !!meta.percentDisplay };
};

// 获取某属性的基础值（不含 modifier 贡献）
const getBaseStatValue = (stats: CalculatedEntityStats, stat: StatKey): number => {
  const { primaryAttributes: primary, specialAttributes: special, ...base } = stats;
  if (stat in primary) return primary[stat as keyof typeof primary];
  if (stat in special) return special[stat as keyof typeof special];
  return base[stat as keyof typeof base];
};

// 格式化属性值：非百分比保留 1 位小数，百分比保留 1 位小数
const formatValue = (value: number, isPercent: boolean): string => {
  if (isPercent) return `${(value * 100).toFixed(1)}%`;
  return String(Math.round(value * 10) / 10);
};

// 格式化 modifier 贡献值（带正负号）
const formatContribution = (flat: number, percent: number, isPercentStat: boolean): string => {
  const parts: string[] = [];
  if (flat !== 0) {
    const sign = flat > 0 ? '+' : '';
    parts.push(sign + (isPercentStat ? `${Math.round(flat * 100)}%` : String(Math.round(flat * 10) / 10)));
  }
  if (percent !== 0) {
    const sign = percent > 0 ? '+' : '';
    parts.push(`${sign}${Math.round(percent * 100)}%`);
  }
  return parts.join('、') || '0';
};

// 格式化派生属性贡献值
const formatDerivedContribution = (contribution: number, isPercent: boolean): string => {
  if (isPercent) return `${(contribution * 100).toFixed(1)}%`;
  return String(Math.round(contribution * 10) / 10);
};

// 字号：行 13px，详情 12px
const TEXT_ROW = 'text-[13px]';
const TEXT_DETAIL = 'text-xs';

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  isOpen, heroName, stats, modifiers, onClose
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groupedMods = useMemo(() => aggregateModifiersBySource(modifiers ?? []), [modifiers]);
  const derivedContributions = useMemo(() => getDerivedStatContributions(stats), [stats]);

  if (!isOpen) return null;

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 渲染单条可修饰属性行
  const renderStatRow = (stat: StatKey) => {
    const meta = STAT_META[stat];
    const { value, isPercent } = getStatValue(stats, stat);
    const sources = getStatSourcesByStat(groupedMods, stat);
    const hasSources = sources.length > 0;
    const rowKey = `stat-${stat}`;
    const isExpanded = expandedKeys.has(rowKey);
    const baseValue = getBaseStatValue(stats, stat);
    const color = STAT_COLOR[stat] ?? 'text-zinc-100';

    return (
      <div key={rowKey} className="flex flex-col">
        <button
          onClick={() => hasSources && toggleExpand(rowKey)}
          className={`flex justify-between items-center py-1 px-2 rounded-lg transition-colors ${
            hasSources ? 'cursor-pointer hover:bg-zinc-800/60' : 'cursor-default'
          }`}
        >
          <span className={`${TEXT_ROW} text-zinc-300 font-bold`}>{meta.label}</span>
          <div className="flex items-center gap-1.5">
            <span className={`${TEXT_ROW} font-black ${color} tabular-nums`}>
              {formatValue(value, isPercent)}
            </span>
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              hasSources ? (isExpanded ? 'rotate-90 text-zinc-300' : 'text-zinc-500') : 'invisible'
            }`} />
          </div>
        </button>
        {isExpanded && hasSources && (
          <div className="flex flex-col gap-0.5 pl-4 pr-2 pb-1.5 border-l-2 border-zinc-700/60 ml-2 mt-0.5">
            {/* 基础值 */}
            <div className="flex justify-between items-center">
              <span className={`${TEXT_DETAIL} text-zinc-500`}>基础值</span>
              <span className={`${TEXT_DETAIL} text-zinc-400 font-bold tabular-nums`}>
                {formatValue(baseValue, isPercent)}
              </span>
            </div>
            {/* modifier 来源分解 */}
            {sources.map(s => (
              <div key={s.source} className="flex justify-between items-center">
                <span className={`${TEXT_DETAIL} text-zinc-500`}>{s.source}</span>
                <span className={`${TEXT_DETAIL} text-emerald-300/90 font-bold tabular-nums`}>
                  {formatContribution(s.flat, s.percent, isPercent)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染单条派生属性行
  const renderDerivedRow = (key: DerivedStatKey) => {
    const meta = DERIVED_STAT_META[key];
    const contributions = derivedContributions[key];
    const hasContributions = contributions.length > 0;

    let value = 0;
    if (key === 'voidSpirit') value = stats.specialAttributes.voidSpirit;
    else value = stats[key as keyof CalculatedEntityStats] as number;

    const rowKey = `derived-${key}`;
    const isExpanded = expandedKeys.has(rowKey);
    const color = DERIVED_COLOR[key] ?? 'text-zinc-100';

    return (
      <div key={rowKey} className="flex flex-col">
        <button
          onClick={() => hasContributions && toggleExpand(rowKey)}
          className={`flex justify-between items-center py-1 px-2 rounded-lg transition-colors ${
            hasContributions ? 'cursor-pointer hover:bg-zinc-800/60' : 'cursor-default'
          }`}
        >
          <span className={`${TEXT_ROW} text-zinc-300 font-bold`}>{meta.label}</span>
          <div className="flex items-center gap-1.5">
            <span className={`${TEXT_ROW} font-black ${color} tabular-nums`}>
              {formatValue(value, meta.percentDisplay)}
            </span>
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              hasContributions ? (isExpanded ? 'rotate-90 text-zinc-300' : 'text-zinc-500') : 'invisible'
            }`} />
          </div>
        </button>
        {isExpanded && hasContributions && (
          <div className="flex flex-col gap-0.5 pl-4 pr-2 pb-1.5 border-l-2 border-zinc-700/60 ml-2 mt-0.5">
            {contributions.map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className={`${TEXT_DETAIL} text-zinc-500`}>
                  {c.source}（{c.sourceValue}）
                </span>
                <span className={`${TEXT_DETAIL} text-zinc-400 font-bold tabular-nums`}>
                  {formatDerivedContribution(c.contribution, meta.percentDisplay)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <div onClick={onClose} className={UI_TOKENS.modalBackdropChild}>
      <div onClick={(e) => e.stopPropagation()} className={UI_TOKENS.modalContainerStandard}>
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <Award className="w-4 h-4 text-amber-400" />
            <h3>【{heroName}】详细属性面板</h3>
          </div>
          <button onClick={onClose} className={UI_TOKENS.modalCloseButton}>
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 定高可滑动属性列表：不分大类，27 条属性依次平铺 */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-0.5 pr-1 mt-3">
          {STAT_ORDER.map(renderStatRow)}
          <div className="border-t border-zinc-700/60 my-1.5" />
          {DERIVED_ORDER.map(renderDerivedRow)}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default React.memo(DetailedStatsModal);
