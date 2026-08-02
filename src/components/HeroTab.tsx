import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { formatBonus } from '../data/bonds';
import { getActiveBonds } from '../state/bonds';
import { useToast } from './ToastSystem';
import PartySlotModal from './PartySlotModal';
import HeroListModal from './HeroListModal';
import HeroDetailModal from './HeroDetailModal';
import { Sparkles, Users, Plus, Shield } from 'lucide-react';

const HeroTab: React.FC = () => {
  const { state, setParty, openSummonModal } = useGame();
  const { showToast } = useToast();

  // Modal 状态
  const [modalSlotIndex, setModalSlotIndex] = useState<number | null>(null);
  const [showHeroListModal, setShowHeroListModal] = useState(false);
  const [detailModalHeroId, setDetailModalHeroId] = useState<string | null>(null);

  const party = state.party || [];
  const partySize = COMBAT_CONFIG.partySize;
  const activeBonds = getActiveBonds(party);

  const handleConfirmPartyModal = (newParty: string[]) => {
    setParty(newParty);
    showToast('小队上阵阵容调整已保存！', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部左侧紧紧相邻的 2 个正方形入口按钮 (对齐反馈 1 & 2:【招募】与【英雄列表】，右侧留空) */}
      <div className="flex items-center gap-3">
        {/* 正方形按钮 1: 招募 */}
        <div
          onClick={openSummonModal}
          className="w-20 h-20 aspect-square rounded-2xl bg-gradient-to-b from-purple-950/80 to-zinc-900/80 border border-purple-500/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-purple-400 transition-all shadow-md active:scale-95 group shrink-0"
        >
          <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-black text-purple-300">
            招募
          </span>
        </div>

        {/* 正方形按钮 2: 英雄列表 */}
        <div
          onClick={() => setShowHeroListModal(true)}
          className="w-20 h-20 aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shadow-md active:scale-95 group shrink-0"
        >
          <Users className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-black text-zinc-200 group-hover:text-amber-300 transition-colors">
            英雄列表
          </span>
        </div>
      </div>

      {/* 中部卡片：上阵配置 (3 个正方形槽位) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md">
        <header className="flex items-center justify-between">
          <h2 className="text-xs font-black text-zinc-100 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> 上阵队伍
          </h2>
          <span className="text-[9px] text-zinc-500 font-bold">
            小队 ({party.length}/{partySize})
          </span>
        </header>

        {/* 3 个固定高度正方形槽位 */}
        <div className="flex gap-3 justify-center">
          {Array.from({ length: partySize }).map((_, i) => {
            const heroId = party[i];
            const config = heroId ? HEROES_CONFIG[heroId] : null;
            const hero = heroId ? state.heroes[heroId] : null;
            const firstChar = config?.name ? config.name[0] : '';

            return (
              <div
                key={i}
                onClick={() => setModalSlotIndex(i)}
                className="flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-105"
              >
                {/* 必须为正方形 1:1 头像框 */}
                <div
                  className={`w-16 h-16 aspect-square rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                    config
                      ? hero?.wounded
                        ? 'bg-red-950/50 border-red-500/50'
                        : 'bg-zinc-950/90 border-amber-500/50 shadow-md shadow-amber-950/30'
                      : 'bg-zinc-950/40 border-zinc-800 border-dashed hover:border-zinc-700'
                  }`}
                >
                  {config ? (
                    config.avatar ? (
                      <img
                        src={config.avatar}
                        alt={config.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-amber-300">
                        {firstChar}
                      </span>
                    )
                  ) : (
                    <Plus className="w-6 h-6 text-zinc-600" />
                  )}

                  {hero?.wounded && (
                    <div className="absolute inset-0 bg-red-950/75 flex items-center justify-center">
                      <span className="text-[9px] font-black text-red-300">重伤</span>
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-bold text-zinc-300 max-w-[64px] truncate text-center">
                  {config?.name || `槽位 ${i + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] text-zinc-500 font-bold text-center">
          点击上方槽位选择英雄上阵。
        </p>

        {/* 羁绊加成 */}
        {party.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {activeBonds.map(bond => (
              <span key={bond.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-950/40 text-emerald-300" title={bond.description}>
                🫱 {bond.name}：{formatBonus(bond.bonus)}
              </span>
            ))}
            {activeBonds.length === 0 && (
              <span className="text-[8px] text-zinc-600 font-bold">
                未触发羁绊——凑齐特定英雄组合或同阵营英雄可激活加成。
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3 人小队上阵 Modal */}
      {modalSlotIndex !== null && (
        <PartySlotModal
          isOpen={modalSlotIndex !== null}
          targetSlotIndex={modalSlotIndex}
          currentParty={party}
          heroes={state.heroes}
          onConfirm={handleConfirmPartyModal}
          onClose={() => setModalSlotIndex(null)}
        />
      )}

      {/* 英雄列表 Modal */}
      <HeroListModal
        isOpen={showHeroListModal}
        heroes={state.heroes}
        onSelectHero={(id) => {
          setDetailModalHeroId(id);
        }}
        onClose={() => setShowHeroListModal(false)}
      />

      {/* 英雄详情 Modal (作为叠加子弹窗，无多重暗沉蒙版) */}
      {detailModalHeroId !== null && (
        <HeroDetailModal
          isOpen={detailModalHeroId !== null}
          heroId={detailModalHeroId}
          onSelectHero={(id) => setDetailModalHeroId(id)}
          onClose={() => setDetailModalHeroId(null)}
        />
      )}
    </div>
  );
};

export default HeroTab;
