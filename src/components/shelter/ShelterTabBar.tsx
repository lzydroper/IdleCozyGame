import React from 'react';
import { SHELTER_TABS } from './constants';
import type { ShelterTabId } from './constants';

interface ShelterTabBarProps {
  active: ShelterTabId;
  onChange: (tab: ShelterTabId) => void;
  counts: Record<ShelterTabId, string | null>;
}

const ShelterTabBar: React.FC<ShelterTabBarProps> = ({ active, onChange, counts }) => (
  <div className="flex gap-1.5 mb-3">
    {SHELTER_TABS.map(tab => {
      const TabIcon = tab.icon;
      const isActive = active === tab.id;
      const badge = counts[tab.id];
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
            isActive
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-md'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TabIcon className="w-3.5 h-3.5" />
          {tab.label}
          {badge && <span className="text-[8px] opacity-70">({badge})</span>}
        </button>
      );
    })}
  </div>
);

export default ShelterTabBar;
