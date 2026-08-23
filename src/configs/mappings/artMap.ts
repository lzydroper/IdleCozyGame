/**
 * 视觉装配（icon 单字段统一解析，替代 sprite/iconKey 双轨）：
 * - 切图经 import 管线收集：URL 带哈希（缓存失效正确），缺文件构建期即报错；
 * - iconKey 走 mappings/iconMap 显式注册表；
 * - 未知/缺失一律 DEV 告警 + HelpCircle 兜底，渲染永不裸奔。
 */
import type { LucideIcon } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import type { GameArt } from '../types/art.types';
import { iconFor } from './iconMap';

const spriteModules = import.meta.glob('../../assets/sprites/**/*.png', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>;

/** 逻辑路径（相对 sprites 根，如 'items/resources/glow_fiber.png'）→ 哈希 URL。 */
export const SPRITE_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(spriteModules).map(([path, url]) => [
    path.replace(/^.*assets\/sprites\//, ''),
    url
  ])
);

export const resolveSpriteUrl = (logicalPath: string): string | undefined =>
  SPRITE_URLS[logicalPath.replace(/^\//, '')];

/** icon 字段解析入口：.png → image（缺失回退 glyph），否则按 iconKey 解析。 */
export const resolveArt = (raw: string | undefined): GameArt | undefined => {
  if (!raw) return undefined;
  if (raw.endsWith('.png')) {
    const url = resolveSpriteUrl(raw);
    if (url) return { kind: 'image', url };
    console.warn(`[artMap] 切图不存在: '${raw}'，回退 HelpCircle`);
    return { kind: 'glyph', Icon: HelpCircle as LucideIcon };
  }
  return { kind: 'glyph', Icon: iconFor(raw) };
};

/** 保底版：任何行装配后必有视觉（缺省 → help-circle 兜底）。 */
export const resolveArtOrDefault = (raw: string | undefined): GameArt =>
  resolveArt(raw) ?? { kind: 'glyph', Icon: iconFor('help-circle') };
