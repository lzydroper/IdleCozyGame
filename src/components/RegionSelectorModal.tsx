import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { isRegionUnlocked, getVisibleRegionsForSelector } from '../state/levelCombat';
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
      <div
        data-testid="region-selector-modal"
        className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 animate-fade-in"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
            <span className="text-xs font-black text-zinc-100">选择区域</span>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 text-sm font-bold cursor-pointer"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
        </div>
      </div>

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
