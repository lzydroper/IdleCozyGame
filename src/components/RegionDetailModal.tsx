import React from 'react';
import { useGame } from '../context/GameContext';
import { getRegion } from '../data/regionSelectors';
import { isRegionUnlocked, getRegionUnlockDiagnostics } from '../state/levelCombat';
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

  const isUnlocked = isRegionUnlocked(state, regionId);
  const diagnostics = getRegionUnlockDiagnostics(state, regionId, mode);

  return (
    <div
      data-testid="region-detail-modal"
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl">
        <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
          <div>
            <div className="text-sm font-black text-zinc-100">{region.name}</div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {region.isTestZone
                ? '测试专用区域'
                : `主线区域 0${region.order}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-bold cursor-pointer"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
          {region.description}
        </p>

        {/* 锁住原因动态诊断区（未解锁时显示） */}
        {!isUnlocked && diagnostics.length > 0 && (
          <div className="space-y-1.5" data-testid="lock-diagnostics-section">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              区域解锁条件诊断
            </div>
            <div className="space-y-1.5 bg-red-950/30 border border-red-900/40 p-2.5 rounded-xl text-xs">
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

        {/* 严格统一为【确认】与【取消】，按钮高度 h-9.5，双按钮对称平分 flex-1 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-9.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center active:scale-98 transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(regionId)}
            className={`flex-1 h-9.5 text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center active:scale-98 transition-all ${
              isUnlocked
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300'
            }`}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionDetailModal;
