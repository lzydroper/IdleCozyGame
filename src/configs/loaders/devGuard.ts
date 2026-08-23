/**
 * loader DEV 守卫（config-json-migration 02 / L2）：
 * 仅 import.meta.env.DEV 执行的轻量必填检查——坏配置开发期秒暴露，生产构建树摇零开销。
 */

export interface DevGuardOptions {
  /** 必填字段清单（undefined 即报错）。 */
  required?: string[];
}

/** 表型守卫：id 一致性 + 必填字段检查；生产环境原样返回。 */
export const devGuardTable = <T extends object>(
  domain: string,
  table: Record<string, T>,
  options: DevGuardOptions = {}
): Record<string, T> => {
  if (!import.meta.env.DEV) return table;
  const required = options.required ?? [];
  for (const [key, row] of Object.entries(table)) {
    if (!row || typeof row !== 'object') {
      throw new Error(`[configs:${domain}] 条目 '${key}' 非对象`);
    }
    const record = row as Record<string, unknown>;
    if ('id' in record && record.id !== key) {
      throw new Error(`[configs:${domain}] key '${key}' 与内容 id '${String(record.id)}' 不一致`);
    }
    for (const field of required) {
      if (record[field] === undefined) {
        throw new Error(`[configs:${domain}] '${key}' 缺少必填字段 '${field}'`);
      }
    }
  }
  return table;
};
