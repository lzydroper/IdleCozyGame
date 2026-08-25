/** 编辑器纯工具函数 */

/** 成员赋值：undefined 表示删除该键（json 置空、映射删除等） */
export const setMember = (obj: Record<string, unknown>, key: string, v: unknown): Record<string, unknown> => {
  const out = { ...obj };
  if (v === undefined) delete out[key];
  else out[key] = v;
  return out;
};

/** 深拷贝（数据文档均为 JSON 值） */
export const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
