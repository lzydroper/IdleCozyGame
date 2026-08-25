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

/**
 * 行数组守卫（数组形态键控表的对应物）：行内 id 即身份——
 * 必须是非空字符串 id、全域唯一，另查必填字段；生产环境原样返回。
 */
export const devGuardRows = <T extends object>(
  domain: string,
  rows: readonly T[],
  options: DevGuardOptions = {}
): readonly T[] => {
  if (!import.meta.env.DEV) return rows;
  const required = options.required ?? [];
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== 'object') {
      throw new Error(`[configs:${domain}] 行 #${index} 非对象`);
    }
    const record = row as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) {
      throw new Error(`[configs:${domain}] 行 #${index} 缺少非空字符串 id（数组形态 id 即身份）`);
    }
    if (seen.has(record.id)) {
      throw new Error(`[configs:${domain}] 重复 id '${record.id}'（数组形态无 key 对账，靠此处查重）`);
    }
    seen.add(record.id);
    for (const field of required) {
      if (record[field] === undefined) {
        throw new Error(`[configs:${domain}] '${record.id}' 缺少必填字段 '${field}'`);
      }
    }
  }
  return rows;
};

/**
 * 键控表双形态归一：map（key=id 对账，devGuardTable）或行数组（行内 id 即身份，devGuardRows）
 * → 统一 [id, row] 条目流。loader 侧行形状断言写成 `Record<string, T> | T[]` 联合后，
 * json 在两形态间迁移零代码改动。生产环境仅做归一不做校验。
 */
export const devGuardKeyed = <T extends object>(
  domain: string,
  raw: Record<string, T> | T[],
  options: DevGuardOptions = {}
): Array<[string, T]> => {
  if (Array.isArray(raw)) {
    return devGuardRows(domain, raw, options).map(
      row => [(row as Record<string, unknown>).id as string, row]
    );
  }
  return Object.entries(devGuardTable(domain, raw, options));
};
