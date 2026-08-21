import React from 'react';
import { createPortal } from 'react-dom';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS, HERO_CLASS_COLORS } from '../data/heroes';
import { HERO_CLASS_LORE, HERO_FACTION_LORE, HERO_FACTION_COLORS } from '../data/heroLore';
import { getAwakenedName } from '../state/awakening';
import { describeDutyBonuses } from '../state/duty';
import { useGame } from '../context/GameContext';
import GameIcon from './GameIcon';
import { UI_TOKENS } from '../data/uiConstants';
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

  // 驻守特长文案（作用域化；无加成则显示「无后勤加成」）
  const dutyParts: string[] = [];
  if (duty) {
    const desc = describeDutyBonuses(duty);
    if (desc) dutyParts.push(desc);
  }

  const modalContent = (
    <div
      onClick={onClose}
      className={UI_TOKENS.modalBackdropChild}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerScroll}
      >
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <Award className="w-4 h-4 text-amber-400" />
            <h3>英雄档案</h3>
          </div>
          <button
            onClick={onClose}
            className={UI_TOKENS.modalCloseButton}
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
        <section className={UI_TOKENS.sectionCard}>
          <h4 className={`${UI_TOKENS.textLabel} font-black text-amber-300 flex items-center gap-1`}>
            <Wrench className="w-3.5 h-3.5 text-amber-400" /> 背景故事
          </h4>
          <p className={`${UI_TOKENS.textBody} text-zinc-300 leading-relaxed`}>{config.backstory}</p>
        </section>

        {/* 职阶设定 */}
        <section className={UI_TOKENS.sectionCard}>
          <h4 className={`${UI_TOKENS.textLabel} font-black flex items-center gap-1 ${clsColor.split(' ')[0]}`}>
            <Shield className="w-3.5 h-3.5" /> 职阶 · {clsLabel}
          </h4>
          <p className={`${UI_TOKENS.textBody} text-zinc-300 leading-relaxed`}>{HERO_CLASS_LORE[config.heroClass]}</p>
        </section>

        {/* 阵营设定 */}
        <section className={UI_TOKENS.sectionCard}>
          <h4 className={`${UI_TOKENS.textLabel} font-black flex items-center gap-1 ${factionColor.split(' ')[0]}`}>
            <Sparkles className="w-3.5 h-3.5" /> 阵营 · {factionLabel}
          </h4>
          <p className={`${UI_TOKENS.textBody} text-zinc-300 leading-relaxed`}>{HERO_FACTION_LORE[config.faction]}</p>
        </section>

        {/* 后台驻守特长 */}
        <section className={UI_TOKENS.sectionCard}>
          <h4 className={`${UI_TOKENS.textLabel} font-black text-amber-300 flex items-center gap-1`}>
            <Factory className="w-3.5 h-3.5 text-amber-400" /> 后台驻守特长
          </h4>
          {dutyParts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dutyParts.map((p, i) => (
                <span key={i} className={`${UI_TOKENS.textMini} font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-md px-1.5 py-0.5 flex items-center gap-1`}>
                  <Package className="w-3 h-3" /> {p}
                </span>
              ))}
            </div>
          ) : (
            <p className={`${UI_TOKENS.textMini} text-zinc-500 font-bold`}>该英雄暂未配置后勤驻守特长。</p>
          )}
        </section>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroDossierModal;
