/**
 * Sheet 注册表：路径模式 → 表单描述。未匹配的文件自动落入 rawJson 兜底。
 */
import type { SheetDef } from './types';
import { equipmentSheets, farmingSheets, itemsSheets, shelterSheets, workshopSheets } from './sheets/contentSheets';
import { enemySheets, heroSheets, survivorSheets } from './sheets/entitySheets';
import { combatSheets, progressionSheets } from './sheets/combatProgressionSheets';
import { eventSheets, regionSheets } from './sheets/worldSheets';

const ALL_SHEETS: SheetDef[] = [
  ...itemsSheets,
  ...workshopSheets,
  ...farmingSheets,
  ...shelterSheets,
  ...equipmentSheets,
  ...enemySheets(),
  ...heroSheets(),
  ...survivorSheets,
  ...regionSheets(),
  ...eventSheets(),
  ...combatSheets(),
  ...progressionSheets()
];

export interface ResolvedSheet {
  path: string;
  domain: string;
  title: string;
  def: SheetDef;
}

export const resolveSheet = (path: string): ResolvedSheet => {
  for (const def of ALL_SHEETS) {
    if (def.pattern.test(path)) {
      return { path, domain: def.domain, title: typeof def.title === 'string' ? def.title : def.title(path), def };
    }
  }
  return {
    path,
    domain: '其他',
    title: path.replace(/^src\/data\//, ''),
    def: { pattern: /^$/, domain: '其他', title: '原始 JSON', mode: { form: 'rawJson' }, notes: ['该文件尚未建模，使用原始 JSON 编辑（保存前会校验可解析）。'] }
  };
};

/** 全量清单（供覆盖测试与侧栏统计） */
export const allSheetDefs = (): readonly SheetDef[] => ALL_SHEETS;
