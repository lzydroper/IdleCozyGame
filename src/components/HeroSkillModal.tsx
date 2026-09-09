// 技能预览弹窗（heroes-skills spec §4）：点击英雄详情三槽打开；
// 锁定态显示解锁条件，解锁态显示当前养成状态下的实际数值（与战斗同源）。
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Flame, Lock, Wand2, TrendingUp, Clock } from 'lucide-react';
import { UI_TOKENS } from '../configs/constants/uiConstants';
import { useGame } from '../context/GameContext';
import { getTalentNodes } from '../state/talents';
import { buildHeroSkillViews, formatSkillCondition } from '../state/heroSkillView';
import { renderAbilityDescription } from '../state/abilityDescription';
import type { SkillRow } from '../configs/types/entity.types';

export interface HeroSkillModalProps {
  isOpen: boolean;
  heroId: string;
  skillIndex: number;
  onClose: () => void;
}

const PATCH_LABELS: Record<string, string> = {
  cooldown: '冷却',
  priority: '发动优先级',
  targeting: '目标策略',
  cost: '费用'
};

const HeroSkillModal: React.FC<HeroSkillModalProps> = ({ isOpen, heroId, skillIndex, onClose }) => {
  const { state } = useGame();
  if (!isOpen) return null;

  const hero = state.heroes[heroId];
  if (!hero) return null;

  const view = buildHeroSkillViews(heroId, hero).find(v => v.row.slot === (skillIndex as SkillRow['slot']));
  if (!view) return null;

  const { row, unlocked } = view;
  const ability = view.ability;
  const conditionText = formatSkillCondition(row.unlock);
  const growthLevelPct = row.growth?.perLevel ? Math.round(row.growth.perLevel * (hero.level - 1) * 100) : 0;
  const growthStarPct = row.growth?.perStar ? Math.round(row.growth.perStar * hero.star * 100) : 0;
  // 下一个未达成的里程碑预告
  const nextMilestone = (row.milestones ?? []).find(ms => {
    const at = ms.at;
    if (at.level !== undefined && hero.level < at.level) return true;
    if (at.star !== undefined && hero.star < at.star) return true;
    if (at.awakened && !hero.awakened) return true;
    return false;
  });
  const milestoneText = nextMilestone
    ? [
        nextMilestone.at.level !== undefined ? `等级 ${nextMilestone.at.level}` : null,
        nextMilestone.at.star !== undefined ? `星级 ${nextMilestone.at.star}` : null,
        nextMilestone.at.awakened ? '觉醒后' : null
      ].filter(Boolean).join('/') +
      '：' +
      Object.entries(nextMilestone.patch)
        .map(([key, value]) => `${PATCH_LABELS[key] ?? key} → ${JSON.stringify(value)}`)
        .join('、')
    : null;
  // 重写来源节点名（供标注）
  const nodes = getTalentNodes(heroId);
  const rewriteLabels = view.rewrites.map(rw => {
    const nodeName = nodes.find(n => (n.rewrites ?? []).some(r => r === rw))?.name ?? '天赋';
    return {
      nodeName,
      aspects: [
        rw.priority !== undefined ? `发动优先级 → ${rw.priority}` : null,
        rw.effects ? Object.keys(rw.effects).map(i => `效果 ${Number(i) + 1} 已改写`).join('、') : null
      ].filter(Boolean).join('；')
    };
  });

  return createPortal(
    <div onClick={onClose} className={UI_TOKENS.modalBackdropChild}>
      <div
        onClick={(e) => e.stopPropagation()}
        // 固定高度：锁定/解锁/重写各状态分区一致，杜绝弹窗高度跳动
        className={`${UI_TOKENS.modalContainerScroll} h-[320px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      >
        <header className={UI_TOKENS.modalHeader}>
          <h3 className={`${UI_TOKENS.modalHeaderTitle} text-purple-300`}>
            <Flame className="w-4 h-4" /> 【{ability?.name ?? view.baseAbility?.name ?? view.slotLabel}】
            <span className="text-[10px] text-zinc-500 font-bold">{view.slotLabel}</span>
          </h3>
          <button onClick={onClose} className={UI_TOKENS.modalCloseButton}>
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        <div className="p-3 flex flex-col gap-2">
          {/* 锁定条：解锁条件 + 当前进度 */}
          {!unlocked && (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-2.5 py-2">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <div className="text-[11px] font-bold leading-relaxed">
                <span className="text-zinc-400">锁定中</span>
                {conditionText && <span className="text-amber-400/90"> —— 解锁条件：{conditionText}</span>}
                <div className="text-[10px] font-medium text-zinc-500">
                  当前：等级 {hero.level} · 星级 {hero.star}
                  {hero.awakened ? ' · 已觉醒' : ''}
                </div>
              </div>
            </div>
          )}

          {/* 效果描述：解锁态渲染实际数值（战斗同源）；锁定态渲染基准值 */}
          <div className="rounded-xl border border-purple-500/25 bg-purple-950/10 px-2.5 py-2">
            <p className="text-xs font-bold text-zinc-200 leading-relaxed">
              {renderAbilityDescription(
                (ability ?? view.baseAbility ?? { description: '' }).description || '',
                unlocked ? ability : view.baseAbility
              )}
              {!unlocked && (
                <span className="ml-1 text-[9px] text-zinc-500 font-medium">（基准值，实际随养成成长）</span>
              )}
            </p>
            {unlocked && ability && (
              <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-black">
                {growthLevelPct > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                    等级加成 +{growthLevelPct}%
                  </span>
                )}
                {growthStarPct > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-sky-950/50 border border-sky-500/30 text-sky-300">
                    星级加成 +{growthStarPct}%
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> 冷却 {ability.cooldown}
                  {ability.cost ? ` · 费用 ${ability.cost.amount} ${ability.cost.resource}` : ''}
                  {` · 优先级 ${ability.priority}`}
                </span>
              </div>
            )}
          </div>

          {/* 成长预览：下一里程碑 */}
          {unlocked && milestoneText && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/10 px-2.5 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-amber-300/90 leading-relaxed">成长预告：{milestoneText}</p>
            </div>
          )}

          {/* 天赋重写标注 */}
          {unlocked && rewriteLabels.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/10 px-2.5 py-2">
              <Wand2 className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                {rewriteLabels.map(label => (
                  <p key={label.nodeName} className="text-[10px] font-bold text-fuchsia-300/90 leading-relaxed">
                    天赋【{label.nodeName}】已重写{label.aspects ? ` —— ${label.aspects}` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HeroSkillModal;
