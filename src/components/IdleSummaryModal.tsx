import React from 'react';
import type { IdleSummaryData } from '../state/levelCombat';
import { ITEMS_CONFIG } from '../data/items';
import GameIcon from './GameIcon';
import { formatDuration } from '../utils/time';

export interface IdleSummaryModalProps {
  isOpen: boolean;
  summary: IdleSummaryData | null;
  onClose: () => void;
}

export const IdleSummaryModal: React.FC<IdleSummaryModalProps> = ({
  isOpen,
  summary,
  onClose
}) => {
  if (!isOpen || !summary) return null;

  const durationStr = formatDuration(summary.durationSeconds);
  const dropEntries = Object.entries(summary.totalDrops || {}).filter(([, qty]) => qty > 0);
  const hasSoulEchoes = (summary.totalSoulEchoes || 0) > 0;
  const hasAnyLoot = dropEntries.length > 0 || hasSoulEchoes;

  return (
    <div
      data-testid="idle-summary-modal"
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-zinc-900 border border-amber-500/50 rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl text-center">
        <div>
          <div className="text-base font-black text-amber-300">挂机已停止</div>
          <div className="text-xs text-zinc-400 mt-1" data-testid="idle-summary-stats">
            总挂机 <span className="font-mono text-zinc-200">{durationStr}</span> · 共完成{' '}
            <span className="font-mono text-emerald-400 font-bold">{summary.totalBattles}</span> 场战斗
          </div>
        </div>

        {/* 累计获得全部物资 */}
        <div className="space-y-1.5 bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-left">
          <div className="text-[10px] text-zinc-500 font-bold">累计获得全部物资</div>
          <div className="flex flex-wrap gap-1.5 text-xs max-h-36 overflow-y-auto">
            {!hasAnyLoot ? (
              <span className="text-[10px] text-zinc-600 italic">本次挂机暂无战利品掉落</span>
            ) : (
              <>
                {dropEntries.map(([itemId, qty]) => {
                  const cfg = ITEMS_CONFIG[itemId];
                  return (
                    <span
                      key={itemId}
                      className="px-2.5 py-1 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-300 font-bold flex items-center gap-1 text-[11px]"
                    >
                      <GameIcon type="item" id={itemId} className="w-3.5 h-3.5" />
                      {cfg?.name || itemId} ×{qty}
                    </span>
                  );
                })}
                {hasSoulEchoes && (
                  <span className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                    <GameIcon type="item" id="soul_echo" className="w-3.5 h-3.5" />
                    灵魂残响 ×{summary.totalSoulEchoes}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <button
          data-testid="idle-summary-confirm-btn"
          onClick={onClose}
          className="w-full h-9.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center active:scale-98 transition-all"
        >
          确认
        </button>
      </div>
    </div>
  );
};

export default IdleSummaryModal;
