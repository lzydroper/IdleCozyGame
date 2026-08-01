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
import { getActiveBonds } from '../state/bonds';
import { useToast } from './ToastSystem';
import HeroEquipmentPanel from './HeroEquipmentPanel';
import HeroTalentPanel from './HeroTalentPanel';
import type { SummonOutcome } from '../state/summon';

const HeroTab: React.FC = () => {
  const { state, summonHero, setParty, healWoundedHero } = useGame();
  const { showToast } = useToast();
  const heroIds = Object.keys(state.heroes);
  const [lastSummon, setLastSummon] = useState<SummonOutcome | null>(null);

  const party = state.party || [];
  const partySize = COMBAT_CONFIG.partySize;
  const naniteCount = state.inventory.nanite_injector || 0;
  // 羁绊加成（ticket 09）：当前上阵队伍命中的羁绊
  const activeBonds = getActiveBonds(party);

  const handleSummon = () => {
    const outcome = summonHero();
    setLastSummon(outcome);
  };

  const handleToggleParty = (id: string) => {
    if (party.includes(id)) {
      setParty(party.filter(p => p !== id));
    } else {
      const ok = setParty([...party, id]);
      if (!ok) showToast('上阵失败：队伍已满或英雄状态异常。', 'warning');
    }
  };

  const handleHeal = (id: string) => {
    const ok = healWoundedHero(id);
    if (ok) {
      showToast(`💉 ${HEROES_CONFIG[id]?.name || id} 已治愈，恢复上阵！`, 'success');
    } else {
      showToast('治愈失败：需要 1 支纳米修复注射针（工坊制造）。', 'error');
    }
  };

  const soulShardEntries = Object.entries(state.soulShards || {}).filter(([, n]) => n > 0);
  const canSummon = (state.soulEchoes || 0) >= SUMMON_CONFIG.costPerSummon;

  return (
    <div className="flex flex-col gap-3">
      {/* 英雄召唤 */}
      <div className="bg-gradient-to-b from-purple-950/60 to-zinc-900/60 border border-purple-500/25 rounded-2xl p-3 flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-black text-purple-300">🔮 英雄召唤</h2>
          <span className="text-[10px] text-purple-300 font-bold">灵魂残响 ×{state.soulEchoes || 0}</span>
        </header>

        <button
          onClick={handleSummon}
          disabled={!canSummon}
          className={`w-full py-2.5 rounded-xl text-xs font-black transition-all border ${
            canSummon
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 border-purple-400/30 text-white shadow-lg shadow-purple-950/30 cursor-pointer active:scale-98'
              : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          召唤一次（{SUMMON_CONFIG.costPerSummon} 灵魂残响）
        </button>

        <div className="text-[9px] text-zinc-500 font-bold flex items-center justify-between">
          <span>软保底进度：连续 {state.summon?.pityCount ?? 0} 抽未出英雄</span>
          <span>{state.summon?.pityCount ?? 0}/{SUMMON_CONFIG.guaranteedAt} 必出</span>
        </div>

        {lastSummon && (
          <div className={`text-[10px] font-bold rounded-xl px-2.5 py-2 border ${
            lastSummon.heroId
              ? 'bg-purple-950/40 border-purple-500/30 text-purple-200'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
          }`}>
            {lastSummon.heroId ? (
              <>
                ✨ 召唤出英雄【{HEROES_CONFIG[lastSummon.heroId]?.name || lastSummon.heroId}】！
                {!lastSummon.isNew && `（重复，转化为灵魂碎片 ×${lastSummon.shardsGained}）`}
              </>
            ) : lastSummon.shardsGained > 0 ? (
              <>💤 共鸣游荡，获得共鸣碎片 ×{lastSummon.shardsGained}</>
            ) : (
              <>灵魂残响不足，无法召唤。</>
            )}
          </div>
        )}

        {/* 碎片库存 */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(state.resonanceShards || 0) > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-purple-500/40 bg-purple-950/40 text-purple-300">
              ✨ 共鸣碎片 ×{state.resonanceShards}
            </span>
          )}
          {soulShardEntries.map(([heroId, n]) => (
            <span key={heroId} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-amber-500/40 bg-amber-950/40 text-amber-300">
              {HEROES_CONFIG[heroId]?.emoji} {HEROES_CONFIG[heroId]?.name}碎片 ×{n}
            </span>
          ))}
          {soulShardEntries.length === 0 && (state.resonanceShards || 0) === 0 && (
            <span className="text-[8px] text-zinc-600">尚无碎片（重复英雄或未出英雄时获得）</span>
          )}
        </div>
      </div>

      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-zinc-100">⚔️ 上阵队伍</h2>
        <span className="text-[9px] text-zinc-500 font-bold">
          已解锁 {heroIds.length} 位英雄
        </span>
      </header>

      {/* 三人小队槽位 */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          {Array.from({ length: partySize }).map((_, i) => {
            const heroId = party[i];
            const config = heroId ? HEROES_CONFIG[heroId] : null;
            const hero = heroId ? state.heroes[heroId] : null;
            return (
              <div
                key={i}
                className={`flex-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 py-2 ${
                  config
                    ? hero?.wounded
                      ? 'bg-red-950/40 border-red-500/40'
                      : 'bg-zinc-950/80 border-purple-500/30'
                    : 'bg-zinc-950/40 border-zinc-800 border-dashed'
                }`}
              >
                <span className="text-xl">{config?.emoji || '＋'}</span>
                <span className="text-[8px] font-bold text-zinc-400">
                  {hero?.wounded ? '重伤' : (config?.name || `槽位 ${i + 1}`)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[8px] text-zinc-600 font-bold">
          {party.length < 1 ? '请先在下方选择英雄上阵，再前往荒野页签开始战斗。' : `小队 ${party.length}/${partySize} 人，按上阵顺序轮询行动（英雄页与战斗区可随时调整）。`}
        </p>

        {/* 羁绊状态（ticket 09）：队伍满足组合/阵营条件即触发，战斗数值生效 */}
        {party.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeBonds.map(bond => (
              <span key={bond.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-950/40 text-emerald-300" title={bond.description}>
                🫱 {bond.name}：{formatBonus(bond.bonus)}
              </span>
            ))}
            {activeBonds.length === 0 && (
              <span className="text-[8px] text-zinc-600 font-bold">
                当前队伍未触发羁绊——凑齐特定英雄组合或同阵营英雄可激活加成。
              </span>
            )}
          </div>
        )}
      </div>

      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-zinc-100">英雄列表</h2>
        <span className="text-[9px] text-zinc-500 font-bold">💉 纳米修复剂 ×{naniteCount}</span>
      </header>

      {heroIds.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
          <div className="text-2xl mb-2">🫥</div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            暂无英雄。开局赠送的第一位英雄诺娃将在这里集结，
            后续可通过英雄召唤与梦境救援获得更多同伴。
          </p>
        </div>
      ) : (
        heroIds.map(id => {
          const config = HEROES_CONFIG[id];
          if (!config) return null;
          const hero = state.heroes[id];
          const classLabel = HERO_CLASS_LABELS[config.heroClass];
          const factionLabel = HERO_FACTION_LABELS[config.faction];
          const classColor = HERO_CLASS_COLORS[config.heroClass];
          const isInParty = party.includes(id);
          const partyFull = party.length >= partySize;

          return (
            <div
              key={id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-2xl shrink-0">
                  {config.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-100 truncate">{config.name}</span>
                    <span className="text-[10px] text-amber-400 font-bold">Lv.{hero.level}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${classColor}`}>
                      {classLabel}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-purple-500/40 bg-purple-950/40 text-purple-300">
                      {factionLabel}
                    </span>
                    {hero.wounded && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-red-500/40 bg-red-950/40 text-red-400 animate-pulse">
                        重伤
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] tracking-tight text-amber-400" title={`${hero.star} 星`}>
                    {'★'.repeat(hero.star)}
                  </div>
                  <div className="text-[8px] text-zinc-600 font-bold mt-0.5">星级</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px] font-bold text-rose-400">
                  <span>生命值</span>
                  <span>{hero.hp}/{hero.maxHp}</span>
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                  <div
                    className={`h-full transition-all duration-300 ${hero.wounded ? 'bg-zinc-600' : 'bg-rose-500'}`}
                    style={{ width: `${(hero.hp / (hero.maxHp || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* 装备面板（ticket 10）：3 槽穿戴 / 强化 / 神话锻造 / 套装特效 */}
              <HeroEquipmentPanel heroId={id} />

              {/* 天赋面板（ticket 11）：职阶主干 + 英雄专属节点加点 */}
              <HeroTalentPanel heroId={id} />

              {/* 上阵/下阵 与 重伤治愈 */}
              {hero.wounded ? (
                <button
                  onClick={() => handleHeal(id)}
                  disabled={naniteCount < 1}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    naniteCount >= 1
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 border-emerald-500/30 text-emerald-100 cursor-pointer active:scale-98'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  💉 治愈重伤（纳米修复剂 {naniteCount >= 1 ? `×${naniteCount}` : '不足'}）
                </button>
              ) : isInParty ? (
                <button
                  onClick={() => handleToggleParty(id)}
                  className="w-full py-1.5 rounded-lg text-[10px] font-black transition-all border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 cursor-pointer active:scale-98"
                >
                  ⬇ 下阵
                </button>
              ) : (
                <button
                  onClick={() => handleToggleParty(id)}
                  disabled={partyFull}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    partyFull
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer active:scale-98'
                  }`}
                >
                  ⬆ 上阵（{party.length}/{partySize}）
                </button>
              )}

              <p className="text-[9px] text-zinc-600 leading-relaxed">{config.backstory}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default HeroTab;
