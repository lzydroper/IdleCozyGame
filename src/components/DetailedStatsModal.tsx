import React from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, Shield, Award } from 'lucide-react';
import type { CalculatedEntityStats } from '../state/statSystem';

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
          {/* 一级元属性 (Primary Attributes) */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="text-xs font-black text-amber-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> 一级元属性 (Primary)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">力量 (STR):</span>
                <span className="font-black text-amber-300">{primary.strength}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">体质 (CON):</span>
                <span className="font-black text-rose-300">{primary.constitution}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">敏捷 (AGI):</span>
                <span className="font-black text-purple-300">{primary.agility}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">智慧 (INT):</span>
                <span className="font-black text-sky-300">{primary.intelligence}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">意志 (WIL):</span>
                <span className="font-black text-emerald-300">{primary.willpower}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500 font-bold">超越 (TRA):</span>
                <span className="font-black text-fuchsia-300">{primary.transcendence}</span>
              </div>
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
