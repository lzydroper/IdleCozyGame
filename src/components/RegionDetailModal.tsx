import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { getRegion } from '../data/regionSelectors';
import { isRegionUnlocked, getRegionUnlockDiagnostics } from '../state/levelCombat';
import { UI_TOKENS } from '../data/uiConstants';
import { Check, X } from 'lucide-react';

export interface RegionDetailModalProps {
  isOpen: boolean;
  regionId: string | null;
  mode: 'exploration' | 'combat' | 'expedition';
  onClose: () => void;
  onConfirm: (regionId: string) => void;
}

export const RegionDetailModal: React.FC<RegionDetailModalProps> = ({
  isOpen,
  regionId,
  mode,
  onClose,
  onConfirm
}) => {
  const { state } = useGame();

  if (!isOpen || !regionId) return null;

  const region = getRegion(regionId);
  if (!region) return null;

  const isUnlocked = isRegionUnlocked(state, regionId, mode);
  const diagnostics = getRegionUnlockDiagnostics(state, regionId, mode);
  // 战斗模式下允许进入待解锁区域查看被封锁的关卡；探索与远征模式下未解锁不可确认
  const canConfirm = isUnlocked || mode === 'combat';

  return createPortal(
    <div
      data-testid="region-detail-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdropChild}
    >
      <div
        data-testid="region-detail-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-3xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-sm font-black text-zinc-100">{region.name}</h3>
            <div className="text-[10px] text-zinc-500 font-mono">
              {region.isTestZone
                ? '测试专用区域'
                : `主线区域 0${region.order}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 固定高度的可滚动内容区：保证无论有无诊断，弹窗整体高度固定等高不变 */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            {region.description}
          </p>

          {/* 锁住原因动态诊断区（未解锁时显示） */}
          {!isUnlocked && diagnostics.length > 0 && (
            <div className="space-y-1.5" data-testid="lock-diagnostics-section">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider px-0.5">
                区域解锁条件诊断
              </div>
              <div className="space-y-2 bg-red-950/30 border border-red-900/40 p-3 rounded-2xl text-xs">
                {diagnostics.map((diag, index) => (
                  <div key={index} className="flex justify-between items-center gap-2">
                    <span className="text-zinc-300 flex items-center gap-1.5 truncate">
                      {diag.passed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className="truncate">{diag.text}</span>
                    </span>
                    <span
                      className={`font-bold shrink-0 text-[11px] ${
                        diag.passed ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {diag.current}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 严格统一为【确认】（左）与【取消】（右），按钮高度 h-9.5，双按钮对称平分 flex-1 */}
        <footer className="flex gap-2 pt-3 border-t border-zinc-800 shrink-0">
          <button
            onClick={() => onConfirm(regionId)}
            disabled={!canConfirm}
            className={`flex-1 h-9.5 text-xs font-black rounded-xl shadow flex items-center justify-center transition-all ${
              canConfirm
                ? isUnlocked
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer active:scale-98'
                  : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 cursor-pointer active:scale-98'
                : 'bg-zinc-850 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            确认
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-9.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center active:scale-98 transition-all"
          >
            取消
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default RegionDetailModal;
