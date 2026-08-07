import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { applyHeroExp } from '../state/combat';
import { UI_TOKENS } from '../data/uiConstants';
import GameIcon from './GameIcon';
import { X, Zap } from 'lucide-react';

export interface ExpLevelUpModalProps {
  isOpen: boolean;
  heroId: string;
  onClose: () => void;
}

// 批量升级弹窗（15 号）：滑条 0..持有经验手册数 + 实时预览（消耗 N 本 → 经验 → 新等级/剩余经验/天赋点），
// 交互范式对齐工坊 CraftBatchModal / 背包批量使用；确认后消耗手册并 applyHeroExp（升级发天赋点）。
const ExpLevelUpModal: React.FC<ExpLevelUpModalProps> = ({ isOpen, heroId, onClose }) => {
  const { state, levelUpWithTome } = useGame();
  const { showToast } = useToast();
  const [count, setCount] = useState(0);
  if (!isOpen) return null;

  const hero = state.heroes[heroId];
  const config = HEROES_CONFIG[heroId];
  const held = state.inventory.exp_tome || 0;
  const expPerTome = ITEMS_CONFIG.exp_tome?.useEffect?.heroExp ?? 0;
  const safeCount = held > 0 ? Math.min(count, held) : 0;

  // 预览：消耗 safeCount 本 → 应用经验后的英雄状态（纯函数模拟，不落库）
  const preview = hero && config && safeCount > 0
    ? applyHeroExp(hero, config, expPerTome * safeCount)
    : null;
  const gainedExp = expPerTome * safeCount;
  const gainedLevels = preview && hero ? preview.level - hero.level : 0;
  const gainedTalent = preview && hero ? (preview.talentPoints || 0) - (hero.talentPoints || 0) : 0;

  const handleConfirm = () => {
    if (safeCount <= 0 || !config) return;
    const ok = levelUpWithTome(heroId, safeCount);
    if (ok) {
      showToast(
        `【${config.name}】消耗 ${safeCount} 本经验手册，升至 Lv.${preview?.level ?? '?'}！`,
        'success'
      );
      setCount(0);
      onClose();
    } else {
      showToast('经验手册不足，无法升级。', 'error');
    }
  };

  const modalContent = (
    <div onClick={onClose} className={UI_TOKENS.modalBackdrop}>
      <div
        data-testid="exp-levelup-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-base font-black text-zinc-100 flex items-center gap-1.5">
            <GameIcon type="item" id="exp_tome" className="w-5 h-5" />
            批量升级 · 经验手册
          </h3>
          <button
            onClick={onClose}
            aria-label="关闭批量升级"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 预览区 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pt-4">
          <div>
            <h5 className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1">所需消耗:</h5>
            <div className="flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                <GameIcon type="item" id="exp_tome" className="w-3.5 h-3.5" />
                经验手册 ×{safeCount}
              </span>
            </div>
          </div>
          <div>
            <h5 className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> 升级预览:
            </h5>
            <div className="flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                +{gainedExp} 经验
              </span>
              {safeCount > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                    Lv.{hero?.level} → Lv.{preview?.level}
                  </span>
                  {gainedLevels > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-300 border border-amber-500/20">
                      升级 ×{gainedLevels} · 天赋点 +{gainedTalent}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 font-bold">
              剩余经验：{preview?.exp ?? hero?.exp ?? 0}
              {hero && preview ? `（升级后）` : ''}
            </p>
          </div>
        </div>

        {/* 滑条 + 确认 */}
        <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-bold">使用数量</span>
            <span className="text-xs font-black text-emerald-400">{safeCount} / {held}</span>
          </div>
          <input
            data-testid="exp-levelup-slider"
            type="range"
            min={0}
            max={Math.max(1, held)}
            value={safeCount}
            disabled={held <= 0}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <button
            data-testid="exp-levelup-confirm"
            onClick={handleConfirm}
            disabled={held <= 0 || safeCount <= 0}
            className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            {held <= 0 ? '背包中没有经验手册' : safeCount <= 0 ? '请选择数量' : '确认升级'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ExpLevelUpModal;
