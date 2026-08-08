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

// 获取某属性当前总值（从 CalculatedEntityStats 中读取）
const getStatValue = (stats: CalculatedEntityStats, stat: StatKey): { value: number; isPercent: boolean } => {
  const meta = STAT_META[stat];
  const { primaryAttributes: primary, specialAttributes: special, ...base } = stats;

  // Primary 属性
  if (stat in primary) {
    return { value: primary[stat as keyof typeof primary], isPercent: !!meta.percentDisplay };
  }
  // Special 属性
  if (stat in special) {
    return { value: special[stat as keyof typeof special], isPercent: !!meta.percentDisplay };
  }
  // Base 属性
  return { value: base[stat as keyof typeof base], isPercent: !!meta.percentDisplay };
};

// 格式化属性值
const formatValue = (value: number, isPercent: boolean): string => {
  if (isPercent) return `${(value * 100).toFixed(1)}%`;
  return String(Math.round(value));
};

// 格式化 modifier 贡献值
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
  return String(Math.round(contribution));
};

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  isOpen,
  heroName,
  stats,
  modifiers,
  onClose
}) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // 按来源分组聚合 modifiers（Memoized）
  const groupedMods = useMemo(
    () => aggregateModifiersBySource(modifiers ?? []),
    [modifiers]
  );

  // 派生属性贡献分解（Memoized）
  const derivedContributions = useMemo(
    () => getDerivedStatContributions(stats),
    [stats]
  );

  if (!isOpen) return null;

  const toggleExpand = (key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  // 渲染单条可修饰属性行
  const renderStatRow = (stat: StatKey) => {
    const meta = STAT_META[stat];
    const { value, isPercent } = getStatValue(stats, stat);
    const sources = getStatSourcesByStat(groupedMods, stat);
    const hasSources = sources.length > 0;
    const rowKey = `stat-${stat}`;
    const isExpanded = expandedKey === rowKey;

    return (
      <div key={rowKey} className="flex flex-col">
        <button
          onClick={() => hasSources && toggleExpand(rowKey)}
          className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-colors ${
            hasSources ? 'cursor-pointer hover:bg-zinc-800/60' : 'cursor-default'
          }`}
        >
          <span className={`${UI_TOKENS.textBodyDense} text-zinc-400 font-bold`}>{meta.label}</span>
          <div className="flex items-center gap-1">
            <span className={`${UI_TOKENS.textBodyDense} font-black text-zinc-100`}>
              {formatValue(value, isPercent)}
            </span>
            {hasSources && (
              <ChevronRight
                className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        </button>
        {isExpanded && hasSources && (
          <div className="flex flex-col gap-0.5 pl-3 pr-1.5 pb-1 border-l border-zinc-800 ml-1.5">
            {sources.map(s => (
              <div key={s.source} className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textMini} text-zinc-500`}>{s.source}</span>
                <span className={`${UI_TOKENS.textMini} text-zinc-400 font-bold`}>
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

    // 获取派生属性当前总值
    let value = 0;
    if (key === 'voidSpirit') {
      value = stats.specialAttributes.voidSpirit;
    } else {
      value = stats[key as keyof CalculatedEntityStats] as number;
    }

    const rowKey = `derived-${key}`;
    const isExpanded = expandedKey === rowKey;

    return (
      <div key={rowKey} className="flex flex-col">
        <button
          onClick={() => hasContributions && toggleExpand(rowKey)}
          className={`flex justify-between items-center py-1 px-1.5 rounded-lg transition-colors ${
            hasContributions ? 'cursor-pointer hover:bg-zinc-800/60' : 'cursor-default'
          }`}
        >
          <span className={`${UI_TOKENS.textBodyDense} text-zinc-400 font-bold`}>{meta.label}</span>
          <div className="flex items-center gap-1">
            <span className={`${UI_TOKENS.textBodyDense} font-black text-zinc-100`}>
              {formatValue(value, meta.percentDisplay)}
            </span>
            {hasContributions && (
              <ChevronRight
                className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </div>
        </button>
        {isExpanded && hasContributions && (
          <div className="flex flex-col gap-0.5 pl-3 pr-1.5 pb-1 border-l border-zinc-800 ml-1.5">
            {contributions.map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textMini} text-zinc-500`}>
                  {c.source}{c.coefficient !== undefined ? ` (${c.sourceValue}×${c.coefficient})` : ` (${c.sourceValue})`}
                </span>
                <span className={`${UI_TOKENS.textMini} text-zinc-400 font-bold`}>
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
    <div
      onClick={onClose}
      className={UI_TOKENS.modalBackdropChild}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <Award className="w-4 h-4 text-amber-400" />
            <h3>【{heroName}】详细属性面板</h3>
          </div>
          <button
            onClick={onClose}
            className={UI_TOKENS.modalCloseButton}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 定高可滑动属性列表：不分大类，27 条属性依次平铺 */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-0.5 pr-1 mt-3">
          {/* 21 项可修饰属性 */}
          {STAT_ORDER.map(renderStatRow)}

          {/* 分隔线 */}
          <div className="border-t border-zinc-800 my-1" />

          {/* 6 项派生属性 */}
          {DERIVED_ORDER.map(renderDerivedRow)}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// 04 号 04c：纯 props 展示组件，React.memo 直接有效（内部无 context 订阅）--
// HeroDetailModal 每秒重渲染时（04b 后已消除）props 引用稳定则跳过。
export default React.memo(DetailedStatsModal);
