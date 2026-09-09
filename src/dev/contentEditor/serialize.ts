/**
 * 规范化序列化：schema 已知键前置排序（未知键保持原有相对顺序追加在后），
 * 2 空格缩进 + 尾换行——与现有 src/data 文件风格一致。
 */
import type { Field, SheetMode } from './types';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// statMod 行的轻量 schema
const STAT_MOD_FIELDS: Field[] = [
  { kind: 'string', key: 'stat', label: 'stat' },
  { kind: 'string', key: 'kind', label: 'kind' },
  { kind: 'number', key: 'value', label: 'value' },
  { kind: 'string', key: 'source', label: 'source' }
];

/** 按 schema 字段顺序重排对象键；schema 外的键按原顺序排在后面。 */
const orderObject = (obj: Record<string, unknown>, fields?: Field[]): Record<string, unknown> => {
  if (!fields) return obj;
  const out: Record<string, unknown> = {};
  for (const fdef of fields) {
    const k = fdef.key;
    if (k && k in obj) out[k] = applyOrder(obj[k], fdef);
  }
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
};

/** 递归应用字段顺序；无 schema 覆盖的值原样返回。 */
export const applyOrder = (value: unknown, field?: Field): unknown => {
  if (field === undefined) return value;
  switch (field.kind) {
    case 'object':
      return isPlainObject(value) ? orderObject(value, field.fields) : value;
    case 'map': {
      if (!isPlainObject(value)) return value;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = applyOrder(v, field.value);
      return out;
    }
    case 'array':
      return Array.isArray(value) ? value.map((v) => applyOrder(v, field.item)) : value;
    case 'refList':
      return value;
    case 'union': {
      if (!isPlainObject(value)) return value;
      const variant = value[field.discriminator];
      const vf = typeof variant === 'string' ? field.variants[variant] : undefined;
      return orderObject(value, vf);
    }
    case 'statModList':
      return Array.isArray(value) ? value.map((m) => (isPlainObject(m) ? orderObject(m, STAT_MOD_FIELDS) : m)) : value;
    default:
      return value;
  }
};

const mapFieldOf = (mode: Extract<SheetMode, { form: 'mapRoot' }>): Field => ({
  kind: 'map',
  keyLabel: mode.keyLabel,
  keyCatalog: mode.keyCatalog,
  valueLabel: mode.valueLabel,
  value: mode.valueField,
  label: ''
});

/** 规范化输出文本：依据表单形态做保序整理 */
export const serializeDoc = (doc: unknown, mode?: SheetMode): string => {
  let value: unknown = doc;
  if (mode) {
    switch (mode.form) {
      case 'rows':
        value = Array.isArray(doc) ? doc.map((row) => (isPlainObject(row) ? orderObject(row, mode.rowFields) : row)) : doc;
        break;
      case 'keyedRows':
        if (isPlainObject(doc)) {
          value = Object.fromEntries(Object.entries(doc).map(([k, row]) => [k, isPlainObject(row) ? orderObject(row, mode.rowFields) : row]));
        }
        break;
      case 'singleObject':
        value = isPlainObject(doc) ? orderObject(doc, mode.fields) : doc;
        break;
      case 'mapRoot':
        value = applyOrder(doc, mapFieldOf(mode));
        break;
      case 'stringList':
      case 'rawJson':
      default:
        break;
    }
  }
  return `${JSON.stringify(value, null, 2)}\n`;
};
