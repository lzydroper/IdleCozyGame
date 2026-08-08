import React from 'react';
import { createPortal } from 'react-dom';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS } from '../../data/heroes';
import type { HeroState } from '../../types/game';
import { UI_TOKENS } from '../../data/uiConstants';
import { User, X } from 'lucide-react';
import GameIcon from '../GameIcon';

export interface DutyAssignModalProps {
  isOpen: boolean;
  title: string;
  heroes: Record<string, HeroState>;
  onSelect: (heroId: string) => void;
  onClose: () => void;
  /** 上阵队伍（party 中的英雄不可再指派后勤，与出战互斥） */
  party?: string[];
}

// 通用后勤指派弹窗（shelter-ui-polish T02）：选择英雄指派到产线驻守/温室浇水/远征探索
// 只列可指派英雄（未驻守 logisticsFacilityId 为 null 且未上阵不在 party）；展示职阶·阵营标签 + dutyMeta 加成角标
export const DutyAssignModal: React.FC<DutyAssignModalProps> = ({
  isOpen,
  title,
  heroes,
  onSelect,
  onClose,
  party = []
}) => {
  if (!isOpen) return null;

  // 可指派英雄：未驻守（logisticsFacilityId 为 null）且未上阵（不在 party 中）
  const assignableHeroIds = Object.entries(heroes)
    .filter(([id, h]) => !h.logisticsFacilityId && !party.includes(id))
    .map(([id]) => id);

  const dutyMetaLabel = (heroId: string): string[] => {
    const meta = HEROES_CONFIG[heroId]?.dutyMeta;
    if (!meta) return [];
    const labels: string[] = [];
    if (meta.facilitySpeedMultiplier) labels.push('速');
    if (meta.facilityYieldMultiplier) labels.push('产');
    if (meta.facilityCostReduction) labels.push('省');
    return labels;
  };

  const modalContent = (
    <div onClick={onClose} className={UI_TOKENS.modalBackdrop}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal 头部 */}
        <header className={UI_TOKENS.modalHeader + ' p-3.5'}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <User className="w-4 h-4 text-cyan-400" />
            <h3>{title}</h3>
          </div>
          <button onClick={onClose} className={UI_TOKENS.modalCloseButton}>
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* 英雄网格内容区 */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5">
          <div className="grid grid-cols-3 gap-3">
            {assignableHeroIds.map((id) => {
              const config = HEROES_CONFIG[id];
              const heroState = heroes[id];
              const metaLabels = dutyMetaLabel(id);
              return (
                <div
                  key={id}
                  onClick={() => onSelect(id)}
                  className="relative flex flex-col rounded-xl overflow-hidden transition-all bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer"
                >
                  {/* 正方形头像区域 */}
                  <div className="aspect-square relative w-full overflow-hidden bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-center">
                    <GameIcon type="hero" id={id} className="w-full h-full" />
                    {/* dutyMeta 加成角标 */}
                    {metaLabels.length > 0 && (
                      <div className="absolute top-1 left-1 flex gap-0.5">
                        {metaLabels.map((label) => (
                          <span key={label} className="text-[8px] font-bold text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/40">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 底部信息：名称 + 职阶·阵营 */}
                  <div className="p-2 flex flex-col items-center justify-center gap-0.5 bg-zinc-900/90">
                    <span className="text-sm font-black text-zinc-100 truncate max-w-full">
                      {config?.name || id}
                    </span>
                    <span className="text-[8px] text-zinc-400">
                      {config ? `${HERO_CLASS_LABELS[config.heroClass]} · ${HERO_FACTION_LABELS[config.faction]}` : ''}
                    </span>
                    <span className="text-[8px] text-zinc-600">
                      Lv.{heroState?.level || 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {assignableHeroIds.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-500">
              无可用英雄（所有英雄已在岗）
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DutyAssignModal;
