import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Shield, Award, Swords } from 'lucide-react';
import type { CalculatedEntityStats, StatModifier } from '../state/statSystem';
import { PRIMARY_STAT_DESCRIPTIONS } from '../data/heroGrowth';
import { UI_TOKENS } from '../data/uiConstants';

export interface DetailedStatsModalProps {
  isOpen: boolean;
  heroName: string;
  stats: CalculatedEntityStats;
  modifiers?: StatModifier[];
  onClose: () => void;
}

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  isOpen,
  heroName,
  stats,
  modifiers,
  onClose
}) => {
  if (!isOpen) return null;

  // modifiers 供 06 号可展开折叠列表使用（来源分解）；当前面板仍用旧布局
  void modifiers;

  const { primaryAttributes: primary, specialAttributes: special } = stats;

  // 基础属性区（16 号，08 决策 D4）：攻击/防御/生命/魔力/暴击/暴伤（已含职阶成长、里程碑、装备与元属性加成）
  const baseRows: { label: string; value: string }[] = [
    { label: '攻击 (ATK)', value: String(stats.attack) },
    { label: '防御 (DEF)', value: String(stats.defense) },
    { label: '生命 (HP)', value: String(stats.maxHp) },
    { label: '魔力 (MP)', value: String(stats.maxMp) },
    { label: '暴击率', value: `${(stats.critRate * 100).toFixed(1)}%` },
    { label: '暴击倍率', value: `${(stats.critDmg * 100).toFixed(0)}%` }
  ];

  const primaryColor: Record<string, string> = {
    strength: 'text-amber-300',
    constitution: 'text-rose-300',
    agility: 'text-purple-300',
    intelligence: 'text-sky-300',
    willpower: 'text-emerald-300',
    transcendence: 'text-fuchsia-300'
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

        {/* 定高可滑动详细属性列表 (对齐点 7: 定高可滑动；头部固定，内容滚动) */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-2 pr-1 mt-3">
          {/* 基础属性 (Base Attributes)：16 号，已含职阶成长/里程碑/装备/元属性加成 */}
          <div className={UI_TOKENS.sectionCard}>
            <div className={`${UI_TOKENS.textLabel} font-black text-zinc-100 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5`}>
              <Swords className="w-4 h-4 text-amber-400" /> 基础属性 (Base)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {baseRows.map(r => (
                <div key={r.label} className="flex justify-between items-center">
                  <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>{r.label}:</span>
                  <span className={`${UI_TOKENS.textBodyDense} font-black text-zinc-100`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 一级元属性 (Primary Attributes)：含每项作用说明（16 号，08 决策 D4） */}
          <div className={UI_TOKENS.sectionCard}>
            <div className={`${UI_TOKENS.textLabel} font-black text-amber-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5`}>
              <Zap className="w-4 h-4 text-amber-400" /> 一级元属性 (Primary)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRIMARY_STAT_DESCRIPTIONS.map(p => (
                <div key={p.key} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>{p.name}:</span>
                    <span className={`${UI_TOKENS.textBodyDense} font-black ${primaryColor[p.key]}`}>{primary[p.key]}</span>
                  </div>
                  <span className={`${UI_TOKENS.textMini} text-zinc-600 font-bold leading-tight mt-0.5`}>{p.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 特殊与防务属性 (Special & Defensive) */}
          <div className={UI_TOKENS.sectionCard}>
            <div className={`${UI_TOKENS.textLabel} font-black text-purple-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5`}>
              <Shield className="w-4 h-4 text-purple-400" /> 高级防务与特殊属性
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">减伤率:</span>
                <span className="font-black text-emerald-300">
                  {(stats.damageReduction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">免暴击率:</span>
                <span className="font-black text-sky-300">
                  {(stats.critResist * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>奥术增幅:</span>
                <span className={`${UI_TOKENS.textBodyDense} font-black text-purple-300`}>+{special.arcaneBoost}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>机械负荷:</span>
                <span className={`${UI_TOKENS.textBodyDense} font-black text-amber-300`}>{special.mechanicalLoad}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>冷却缩减:</span>
                <span className={`${UI_TOKENS.textBodyDense} font-black text-fuchsia-300`}>
                  {(stats.cooldownReduction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`${UI_TOKENS.textBodyDense} text-zinc-500 font-bold`}>伤害豁免:</span>
                <span className={`${UI_TOKENS.textBodyDense} font-black text-teal-300`}>{special.voidSpirit}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// 04 号 04c：纯 props 展示组件，React.memo 直接有效（内部无 context 订阅）——
// HeroDetailModal 每秒重渲染时（04b 后已消除）props 引用稳定则跳过。
export default React.memo(DetailedStatsModal);
