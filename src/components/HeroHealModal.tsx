import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { HEROES_CONFIG } from '../data/heroes';
import { UI_TOKENS } from '../data/uiConstants';
import { X, Check, HeartCrack } from 'lucide-react';
import GameIcon from './GameIcon';

interface HeroHealModalProps {
  onClose: () => void;
}

// 纳米修复剂治愈界面（ADR-0016/ticket 05）：
// 复用 PartySlotModal 的 3 列网格 + 勾选 + 确认样式，仅列出重伤英雄，多选确认后按勾选数批量治愈。
const HeroHealModal: React.FC<HeroHealModalProps> = ({ onClose }) => {
  const { state, healWoundedHeroes } = useGame();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const woundedHeroes = Object.entries(state.heroes)
    .filter(([, hero]) => hero.wounded)
    .map(([id, hero]) => ({ id, hero }));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const ok = healWoundedHeroes(ids);
    if (ok) {
      showToast(`已使用 ${ids.length} 支纳米修复剂，治愈 ${ids.length} 名重伤英雄`, 'success');
      onClose();
    } else {
      showToast('治愈失败：纳米修复剂不足', 'error');
    }
  };

  return createPortal(
    <div
      data-testid="hero-heal-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdropSub}
    >
      <div
        data-testid="hero-heal-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-sm font-black text-zinc-100 flex items-center gap-1.5">
            <HeartCrack className="w-4 h-4 text-red-400" /> 治愈重伤英雄
          </h3>
          <button
            onClick={onClose}
            aria-label="关闭治愈界面"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 重伤英雄网格（仅列出重伤，多选勾选） */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3">
          {woundedHeroes.length === 0 ? (
            <p className="text-xs text-zinc-600 italic text-center py-8">当前没有重伤英雄</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {woundedHeroes.map(({ id }) => {
                const cfg = HEROES_CONFIG[id];
                const firstChar = cfg?.name ? cfg.name[0] : '?';
                const isSelected = selected.has(id);
                return (
                  <div
                    key={id}
                    data-testid={`heal-hero-${id}`}
                    onClick={() => toggle(id)}
                    className={`relative flex flex-col rounded-xl overflow-hidden transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-2 border-emerald-400 shadow-md shadow-emerald-950/40'
                        : 'bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="aspect-square relative w-full overflow-hidden bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-center">
                      {cfg ? (
                        <GameIcon type="hero" id={cfg.id} className="w-full h-full" />
                      ) : (
                        <span className="text-3xl font-black text-amber-300">{firstChar}</span>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg">
                            <Check className="w-6.5 h-6.5 stroke-[3.5]" />
                          </div>
                        </div>
                      )}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center">
                          <span className="text-[9px] font-black text-red-300">重伤</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-200 text-center py-1.5 truncate">
                      {cfg?.name || id}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部：取消 + 确认（无勾选禁用） */}
        <div className="flex gap-2.5 shrink-0 border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold text-xs rounded-xl cursor-pointer hover:bg-zinc-800 transition-all active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            确认治愈（{selected.size}）
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HeroHealModal;
