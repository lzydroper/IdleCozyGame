/**
 * 视觉资产类型（icon 单字段统一）：json 侧 icon 为字符串（.png 切图路径或 Lucide iconKey），
 * 装配层（configs/mappings/artMap）解析为 GameArt 判别联合，渲染点零分支泄漏。
 */
import type { LucideIcon } from 'lucide-react';

export type GameArt =
  | { kind: 'image'; url: string }
  | { kind: 'glyph'; Icon: LucideIcon };
