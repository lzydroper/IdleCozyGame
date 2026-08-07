import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Shield, Award, Swords } from 'lucide-react';
import type { CalculatedEntityStats } from '../state/statSystem';
import { PRIMARY_STAT_DESCRIPTIONS } from '../data/heroGrowth';

export interface DetailedStatsModalProps {
  isOpen: boolean;
  heroName: string;
  stats: CalculatedEntityStats;
  onClose: () => void;
}

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  isOpen,
  heroName,
  stats,
  onClose
}) => {
  if (!isOpen) return null;

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
      className="fixed inset-0 z-[10001] bg-transparent flex flex-col items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col gap-3 shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">
              【{heroName}】详细属性面板
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 定高可滑动详细属性列表 (对齐点 7: 定高可滑动) */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          {/* 基础属性 (Base Attributes)：16 号，已含职阶成长/里程碑/装备/元属性加成 */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-xs font-black text-zinc-100 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-amber-400" /> 基础属性 (Base)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {baseRows.map(r => (
                <div key={r.label} className="flex justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold">{r.label}:</span>
                  <span className="font-black text-zinc-100">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 一级元属性 (Primary Attributes)：含每项作用说明（16 号，08 决策 D4） */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-xs font-black text-amber-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> 一级元属性 (Primary)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {PRIMARY_STAT_DESCRIPTIONS.map(p => (
                <div key={p.key} className="flex flex-col">
                  <div className="flex justify-between text-zinc-300">
                    <span className="text-zinc-500 font-bold">{p.name}:</span>
                    <span className={`font-black ${primaryColor[p.key]}`}>{primary[p.key]}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600 font-bold leading-tight mt-0.5">{p.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 特殊与防务属性 (Special & Defensive) */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-xs font-black text-purple-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> 高级防务与特殊属性
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
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
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">奥术增幅:</span>
                <span className="font-black text-purple-300">+{special.arcaneBoost}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">机械负荷:</span>
                <span className="font-black text-amber-300">{special.mechanicalLoad}%</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">冷却缩减:</span>
                <span className="font-black text-fuchsia-300">
                  {(stats.cooldownReduction * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">伤害豁免:</span>
                <span className="font-black text-teal-300">{special.voidSpirit}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DetailedStatsModal;
