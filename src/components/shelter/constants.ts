import type { LucideIcon } from 'lucide-react';
import { Settings, Sprout, Cpu, Compass } from 'lucide-react';

export interface ShelterTabConfig {
  id: ShelterTabId;
  label: string;
  icon: LucideIcon;
}

export type ShelterTabId = 'base' | 'greenhouse' | 'facility' | 'expedition';

export const SHELTER_TABS: ShelterTabConfig[] = [
  { id: 'base', label: '基建', icon: Settings },
  { id: 'greenhouse', label: '温室', icon: Sprout },
  { id: 'facility', label: '产线', icon: Cpu },
  { id: 'expedition', label: '远征', icon: Compass },
];

// 统一 section 样式（对齐 WorkshopTab）
export const SECTION_WRAPPER = 'p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-md';
export const SECTION_TITLE = 'text-sm font-black text-white mb-4 flex items-center gap-1.5';
