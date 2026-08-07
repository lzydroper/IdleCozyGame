import React from 'react';
import { createPortal } from 'react-dom';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS, HERO_CLASS_COLORS } from '../data/heroes';
import { HERO_CLASS_LORE, HERO_FACTION_LORE, HERO_FACTION_COLORS } from '../data/heroLore';
import { getAwakenedName } from '../state/awakening';
import { useGame } from '../context/GameContext';
import GameIcon from './GameIcon';
import { X, Award, Shield, Sparkles, Factory, Wrench, Package } from 'lucide-react';

export interface HeroDossierModalProps {
  isOpen: boolean;
  heroId: string | null;
  onClose: () => void;
}

// 英雄档案弹窗（10 号）：名称/描述/职阶（+设定）/阵营（+设定）/后台驻守特长 + 头部档案卡。
// 入口：英雄详情页「后勤驻守特长」卡片（可点击）。
const HeroDossierModal: React.FC<HeroDossierModalProps> = ({ isOpen, heroId, onClose }) => {
  const { state } = useGame();
  if (!isOpen || !heroId) return null;

  const config = HEROES_CONFIG[heroId];
  const hero = state.heroes[heroId];
  if (!config || !hero) return null;

  const awakenedName = getAwakenedName(heroId, hero) || config.name;
  const clsLabel = HERO_CLASS_LABELS[config.heroClass];
  const factionLabel = HERO_FACTION_LABELS[config.faction];
  const clsColor = HERO_CLASS_COLORS[config.heroClass];
  const factionColor = HERO_FACTION_COLORS[config.faction];
  const duty = config.dutyMeta;

  // 驻守特长文案（逐项拼接；无加成则显示「无后勤加成」）
  const dutyParts: string[] = [];
  if (duty) {
    if (duty.facilitySpeedMultiplier) dutyParts.push(`生产速度 +${Math.round(duty.facilitySpeedMultiplier * 100)}%`);
    if (duty.facilityYieldMultiplier) dutyParts.push(`额外产出 +${Math.round(duty.facilityYieldMultiplier * 100)}%`);
    if (duty.facilityCostReduction) dutyParts.push(`配方消耗 -${Math.round(duty.facilityCostReduction * 100)}%`);
  }

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10002] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[85vh] p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto"
      >
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">英雄档案</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 头部档案卡：头像 + 名称 + 职阶/阵营标签 */}
        <div className="flex items-center gap-3 bg-zinc-950/70 border border-zinc-800 rounded-xl p-3">
          <div className="w-14 h-14 aspect-square rounded-xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-amber-950/20 shrink-0">
            <GameIcon type="hero" id={config.id} className="w-full h-full" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-black text-zinc-100 truncate">{awakenedName}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${clsColor}`}>
                <Shield className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />
                {clsLabel}
              </span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${factionColor}`}>
                <Sparkles className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />
                {factionLabel}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-bold">Lv.{hero.level} · {awakenedName === config.name ? '未觉醒' : '已觉醒'}</span>
          </div>
        </div>

        {/* 描述 */}
        <section className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1">
          <h4 className="text-[10px] font-black text-amber-300 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-amber-400" /> 背景故事
          </h4>
          <p className="text-[10px] text-zinc-300 leading-relaxed">{config.backstory}</p>
        </section>

        {/* 职阶设定 */}
        <section className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1">
          <h4 className={`text-[10px] font-black flex items-center gap-1 ${clsColor.split(' ')[0]}`}>
            <Shield className="w-3 h-3" /> 职阶 · {clsLabel}
          </h4>
          <p className="text-[10px] text-zinc-300 leading-relaxed">{HERO_CLASS_LORE[config.heroClass]}</p>
        </section>

        {/* 阵营设定 */}
        <section className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1">
          <h4 className={`text-[10px] font-black flex items-center gap-1 ${factionColor.split(' ')[0]}`}>
            <Sparkles className="w-3 h-3" /> 阵营 · {factionLabel}
          </h4>
          <p className="text-[10px] text-zinc-300 leading-relaxed">{HERO_FACTION_LORE[config.faction]}</p>
        </section>

        {/* 后台驻守特长 */}
        <section className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1">
          <h4 className="text-[10px] font-black text-amber-300 flex items-center gap-1">
            <Factory className="w-3 h-3 text-amber-400" /> 后台驻守特长
          </h4>
          {dutyParts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dutyParts.map((p, i) => (
                <span key={i} className="text-[9px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                  <Package className="w-2.5 h-2.5" /> {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 font-bold">该英雄暂未配置后勤驻守特长。</p>
          )}
        </section>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroDossierModal;
