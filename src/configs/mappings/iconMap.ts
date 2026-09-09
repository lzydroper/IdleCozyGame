/**
 * iconKey → LucideIcon 显式注册表（config-json-migration 03 号票定稿）。
 * - key = lucide 官方名 kebab-case；
 * - named-import 显式注册（tree-shaking 友好，拼错在表内一眼可见）；
 * - 兜底：未知 key → DEV warn + HelpCircle（生产静默）；
 * - 与 GameIcon 的 sprite/lucide 双轨体系并行不合并。
 */
import {
  Apple,
  Battery,
  BatteryCharging,
  BatteryFull,
  BookOpen,
  CircleDot,
  Cog,
  Cpu,
  Cross,
  CupSoda,
  Diamond,
  Flame,
  FlaskConical,
  Flower2,
  Footprints,
  Gem,
  Hammer,
  HandMetal,
  HeartPulse,
  HelpCircle,
  Lamp,
  Layers,
  Leaf,
  MoonStar,
  Orbit,
  Package,
  PackageOpen,
  Pill,
  Radar,
  RefreshCw,
  Rocket,
  ScanSearch,
  ScrollText,
  Shield,
  Snowflake,
  Soup,
  Sparkle,
  Sparkles,
  Sprout,
  Sword,
  Syringe,
  TowerControl,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon
} from 'lucide-react';

export const ICON_MAP = {
  apple: Apple,
  battery: Battery,
  'battery-charging': BatteryCharging,
  'battery-full': BatteryFull,
  'book-open': BookOpen,
  'circle-dot': CircleDot,
  cog: Cog,
  cpu: Cpu,
  cross: Cross,
  'cup-soda': CupSoda,
  diamond: Diamond,
  flame: Flame,
  'flask-conical': FlaskConical,
  'flower-2': Flower2,
  footprints: Footprints,
  gem: Gem,
  hammer: Hammer,
  'hand-metal': HandMetal,
  'heart-pulse': HeartPulse,
  lamp: Lamp,
  layers: Layers,
  leaf: Leaf,
  'moon-star': MoonStar,
  orbit: Orbit,
  package: Package,
  'package-open': PackageOpen,
  pill: Pill,
  radar: Radar,
  'refresh-cw': RefreshCw,
  rocket: Rocket,
  'scan-search': ScanSearch,
  'scroll-text': ScrollText,
  shield: Shield,
  snowflake: Snowflake,
  soup: Soup,
  sparkle: Sparkle,
  sparkles: Sparkles,
  sprout: Sprout,
  sword: Sword,
  syringe: Syringe,
  'tower-control': TowerControl,
  wheat: Wheat,
  wrench: Wrench,
  zap: Zap
} as const;

export type IconKey = keyof typeof ICON_MAP;

/** 解析 iconKey 为组件；未知 key DEV 告警并回退 HelpCircle。 */
export const iconFor = (key: string): LucideIcon => {
  const icon = (ICON_MAP as Record<string, LucideIcon | undefined>)[key];
  if (!icon) {
    if (import.meta.env.DEV) {
      console.warn(`[iconMap] 未知 iconKey '${key}'，回退 HelpCircle`);
    }
    return HelpCircle;
  }
  return icon;
};
