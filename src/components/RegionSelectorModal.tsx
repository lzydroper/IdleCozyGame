import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { isRegionUnlocked, getVisibleRegionsForSelector } from '../state/levelCombat';
import { UI_TOKENS } from '../configs/constants/uiConstants';
import { X, MapPin } from 'lucide-react';
import RegionDetailModal from './RegionDetailModal';

export interface RegionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'exploration' | 'combat' | 'expedition';
  selectedRegionId: string | null;
  onConfirmSelect: (regionId: string) => void;
}

export const RegionSelectorModal: React.FC<RegionSelectorModalProps> = ({
  isOpen,
  onClose,
  mode,
  selectedRegionId,
  onConfirmSelect
}) => {
  const { state } = useGame();
  const [detailRegionId, setDetailRegionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const visibleRegions = getVisibleRegionsForSelector(state, mode);

  return (
    <>
      {createPortal(
        <div
          data-testid="region-selector-backdrop"
          onClick={onClose}
          className={UI_TOKENS.modalBackdrop}
        >
          <div
            data-testid="region-selector-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-750 rounded-3xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4.5 h-4.5 text-cyan-400" />
                <h3 className="text-sm font-black text-zinc-100">选择区域</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                aria-label="关闭"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Scrollable list: 固定高度内的可滚动列表，弹窗高度始终恒定 */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2 space-y-2 pr-0.5">
              {visibleRegions.map((region) => {
                const isUnlocked = isRegionUnlocked(state, region.id, mode);
                const isSelected = region.id === selectedRegionId;

                return (
                  <div
                    key={region.id}
                    data-testid={`region-item-${region.id}`}
                    onClick={() => setDetailRegionId(region.id)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                      isSelected
                        ? 'bg-zinc-800 border-amber-500/60 shadow-lg'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-zinc-100 flex items-center gap-1.5">
                        {region.name}
                        {isSelected && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {region.isTestZone ? '测试专用区域' : `主线区域 0${region.order}`}
                      </div>
                    </div>
                    <div>
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/30 rounded-md">
                          已解锁
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-500 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                          待解锁
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <footer className="pt-2 border-t border-zinc-800 shrink-0">
              <button
                onClick={onClose}
                className="w-full h-9.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center active:scale-98 transition-all"
              >
                关闭
              </button>
            </footer>
          </div>
        </div>,
        document.body
      )}

      <RegionDetailModal
        isOpen={!!detailRegionId}
        regionId={detailRegionId}
        mode={mode}
        onClose={() => setDetailRegionId(null)}
        onConfirm={(regionId) => {
          onConfirmSelect(regionId);
          setDetailRegionId(null);
          onClose();
        }}
      />
    </>
  );
};

export default RegionSelectorModal;
