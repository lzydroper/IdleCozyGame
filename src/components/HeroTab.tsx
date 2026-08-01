import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  HEROES_CONFIG,
  HERO_CLASS_LABELS,
  HERO_FACTION_LABELS,
  HERO_CLASS_COLORS
} from '../data/heroes';
import { SUMMON_CONFIG } from '../data/summonConfig';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { formatBonus } from '../data/bonds';
import { getAwakenedName } from '../state/awakening';
import { getActiveBonds } from '../state/bonds';
import { useToast } from './ToastSystem';
import PartySlotModal from './PartySlotModal';
import HeroListModal from './HeroListModal';
import HeroDetailModal from './HeroDetailModal';
import { Sparkles, Users, Plus, Shield } from 'lucide-react';

const HeroTab: React.FC = () => {
  const { state, summonHero, setParty, healWoundedHero } = useGame();
  const { showToast } = useToast();
  const heroIds = Object.keys(state.heroes);

  // Modal 状态
  const [modalSlotIndex, setModalSlotIndex] = useState<number | null>(null);
  const [showHeroListModal, setShowHeroListModal] = useState(false);
  const [detailModalHeroId, setDetailModalHeroId] = useState<string | null>(null);

  const party = state.party || [];
  const partySize = COMBAT_CONFIG.partySize;
  const naniteCount = state.inventory.nanite_injector || 0;
  const activeBonds = getActiveBonds(party);

  const handleSummon = () => {
    summonHero();
  };

  const handleConfirmPartyModal = (newParty: string[]) => {
    setParty(newParty);
    showToast('小队上阵阵容调整已保存！', 'success');
  };

  const handleHeal = (id: string) => {
    const ok = healWoundedHero(id);
    if (ok) {
      showToast(`💉 ${HEROES_CONFIG[id]?.name || id} 已治愈，恢复上阵！`, 'success');
    } else {
      showToast('治愈失败：需要 1 支纳米修复注射针（工坊制造）。', 'error');
    }
  };

  const canSummon = (state.soulEchoes || 0) >= SUMMON_CONFIG.costPerSummon;

  return (
    <div className="flex flex-col gap-3.5">
      {/* 顶部两卡片并排 (对齐图 1: 左【预留的英雄召唤入口】| 右【英雄列表入口】) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 左侧卡片：英雄召唤 */}
        <div className="bg-gradient-to-b from-purple-950/60 to-zinc-900/60 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-lg">
          <header className="flex items-center justify-between">
            <h2 className="text-xs font-black text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 英雄召唤
            </h2>
          </header>

          <button
            onClick={handleSummon}
            disabled={!canSummon}
            className={`w-full py-2 rounded-xl text-[10px] font-black transition-all border ${
              canSummon
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 border-purple-400/30 text-white shadow-md cursor-pointer active:scale-98'
                : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            召唤一次 ({SUMMON_CONFIG.costPerSummon} 灵魂残响)
          </button>

          <div className="text-[8px] text-zinc-400 font-bold flex flex-col gap-0.5">
            <div className="flex items-center justify-between text-zinc-500">
              <span>软保底进度:</span>
              <span>{state.summon?.pityCount ?? 0}/{SUMMON_CONFIG.guaranteedAt} 必出</span>
            </div>
            {(state.resonanceShards || 0) > 0 && (
              <span className="text-purple-300 truncate">
                ✨ 共鸣碎片 ×{state.resonanceShards}
              </span>
            )}
          </div>
        </div>

        {/* 右侧卡片：英雄列表入口 */}
        <div
          onClick={() => setShowHeroListModal(true)}
          className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-lg cursor-pointer group transition-all"
        >
          <header className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-200 group-hover:text-amber-300 transition-colors flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> 英雄列表
            </h2>
            <span className="text-[9px] text-amber-400 font-bold">
              已解锁 {heroIds.length} 位
            </span>
          </header>

          <div className="flex items-center justify-center py-2">
            <div className="flex -space-x-2 overflow-hidden">
              {heroIds.slice(0, 3).map((id) => {
                const config = HEROES_CONFIG[id];
                const firstChar = config?.name ? config.name[0] : '英';
                return (
                  <div
                    key={id}
                    className="w-8 h-8 rounded-full bg-zinc-950 border border-amber-500/40 flex items-center justify-center text-xs font-black text-amber-300 shadow"
                  >
                    {config?.avatar ? (
                      <img src={config.avatar} alt={config.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      firstChar
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[9px] text-zinc-400 font-bold text-center group-hover:text-amber-300 transition-colors">
            点击查看全体英雄属性 ›
          </div>
        </div>
      </div>

      {/* 中部卡片：上阵配置 (对齐图 1) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md">
        <header className="flex items-center justify-between">
          <h2 className="text-xs font-black text-zinc-100 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> 上阵配置
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
          </div>
        )}
      </div>

      {/* 下方延伸区域：已解锁英雄列表（快捷控制与状态展现，未来可继续往下添加新功能） */}
      <div className="flex flex-col gap-2.5">
        <header className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-zinc-400">英雄管理列表</h2>
          <span className="text-[9px] text-zinc-500 font-bold">💉 纳米修复剂 ×{naniteCount}</span>
        </header>

        {heroIds.map(id => {
          const config = HEROES_CONFIG[id];
          if (!config) return null;
          const hero = state.heroes[id];
          const classLabel = HERO_CLASS_LABELS[config.heroClass];
          const factionLabel = HERO_FACTION_LABELS[config.faction];
          const classColor = HERO_CLASS_COLORS[config.heroClass];
          const isInParty = party.includes(id);
          const firstChar = config.name ? config.name[0] : '英';

          return (
            <div
              key={id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setDetailModalHeroId(id)}
                  className="w-12 h-12 aspect-square rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-xl font-black text-amber-300 shrink-0 overflow-hidden relative cursor-pointer hover:border-amber-500/50 transition-all shadow"
                  title="点击查看英雄详情面板"
                >
                  {config.avatar ? (
                    <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
                  ) : (
                    firstChar
                  )}
                </div>

                <div
                  onClick={() => setDetailModalHeroId(id)}
                  className="flex-1 min-w-0 cursor-pointer group"
                  title="点击查看英雄详情面板"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-100 group-hover:text-amber-300 transition-colors truncate">
                      {getAwakenedName(id, hero) || config.name}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold">Lv.{hero.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${classColor}`}>
                      {classLabel}
                    </span>
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-purple-500/40 bg-purple-950/40 text-purple-300">
                      {factionLabel}
                    </span>
                    {isInParty && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300">
                        已上阵
                      </span>
                    )}
                    {hero.logisticsFacilityId && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-sky-500/40 bg-sky-950/40 text-sky-300">
                        后勤中
                      </span>
                    )}
                    {hero.wounded && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-red-500/40 bg-red-950/40 text-red-400">
                        重伤
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-amber-400">
                    {'★'.repeat(hero.star)}
                  </div>
                  <button
                    onClick={() => setDetailModalHeroId(id)}
                    className="text-[9px] text-amber-400 font-bold hover:underline cursor-pointer mt-0.5 block"
                  >
                    详情面板 ›
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold text-rose-400">
                <span>生命值 {hero.hp}/{hero.maxHp}</span>
                {hero.wounded && naniteCount >= 1 && (
                  <button
                    onClick={() => handleHeal(id)}
                    className="text-[9px] text-emerald-400 hover:underline cursor-pointer font-bold"
                  >
                    💉 治愈重伤
                  </button>
                )}
              </div>
            </div>
          );
        })}
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

      {/* 英雄详情 Modal */}
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
