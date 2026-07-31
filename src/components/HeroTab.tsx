import React from 'react';
import { useGame } from '../context/GameContext';
import {
  HEROES_CONFIG,
  HERO_CLASS_LABELS,
  HERO_FACTION_LABELS,
  HERO_CLASS_COLORS
} from '../data/heroes';

const HeroTab: React.FC = () => {
  const { state } = useGame();
  const heroIds = Object.keys(state.heroes);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-zinc-100">⚔️ 英雄编队</h2>
        <span className="text-[9px] text-zinc-500 font-bold">
          已解锁 {heroIds.length} 位英雄
        </span>
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

              <p className="text-[9px] text-zinc-600 leading-relaxed">{config.backstory}</p>
            </div>
          );
        })
      )}
    </div>
  );
};

export default HeroTab;
