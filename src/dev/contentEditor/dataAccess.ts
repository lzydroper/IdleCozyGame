/**
 * 数据访问：枚举 src/data 全部 json、按需加载为原始文档、切图/iconKey 资产清单。
 * 编辑器直接读写原始 JSON——不经过 loader，个别文件损坏不影响其余文件编辑。
 */
import { SPRITE_URLS } from '../../configs/mappings/artMap';
import { ICON_MAP } from '../../configs/mappings/iconMap';
import type { JsonValue } from './types';

const dataModules = import.meta.glob<{ default: unknown }>('../../data/**/*.json');

const toDataPath = (p: string): string => p.replace(/^\.\.\/\.\.\//, 'src/');

/** 规范化路径（src/data/...）→ 模块加载器 */
const loaders = new Map<string, () => Promise<{ default: unknown }>>();
for (const [p, load] of Object.entries(dataModules)) {
  loaders.set(toDataPath(p), () => load());
}

export const DATA_PATHS: string[] = [...loaders.keys()].sort();

export interface LoadResult {
  docs: Record<string, JsonValue>;
  errors: Record<string, string>;
}

/** 加载全部数据文件；解析失败的文件记入 errors（内容以 null 占位，仍可 rawJson 修复） */
export const loadAllDocs = async (): Promise<LoadResult> => {
  const docs: Record<string, JsonValue> = {};
  const errors: Record<string, string> = {};
  await Promise.all(
    [...loaders.entries()].map(async ([path, load]) => {
      try {
        const mod = await load();
        docs[path] = mod.default as JsonValue;
      } catch (e) {
        errors[path] = e instanceof Error ? e.message : String(e);
        docs[path] = null;
      }
    })
  );
  return { docs, errors };
};

/** 切图逻辑路径 → 哈希 URL（复用 artMap 的收集结果） */
export const SPRITE_PATHS: string[] = Object.keys(SPRITE_URLS).sort();
export const spriteUrl = (logicalPath: string): string | undefined => SPRITE_URLS[logicalPath];

/** 已注册 Lucide iconKey 全集 */
export const LUCIDE_KEYS: string[] = Object.keys(ICON_MAP).sort();
