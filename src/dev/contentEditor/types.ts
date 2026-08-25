/**
 * 配置编辑器 schema 类型（dev-only，#editor 开发页专用）。
 * 设计：声明式字段树驱动表单渲染 + 校验 + 规范化序列化；
 * 引用下拉统一走 CatalogKey 目录表（catalogs.ts 从原始 json 派生，不依赖 loader）。
 */

// === 引用目录键 ===

export type CatalogKey =
  | 'item'
  | 'enemy'
  | 'hero'
  | 'ability'
  | 'buff'
  | 'equipmentSet'
  | 'equipment'
  | 'facility'
  | 'shelterUpgrade'
  | 'crop'
  | 'region'
  | 'level'
  | 'realityEvent'
  | 'dreamEvent'
  | 'rescueEvent'
  | 'rescueLocation'
  | 'talentNode'
  | 'heroClass'
  | 'faction'
  | 'stat';

export interface CatalogOption {
  id: string;
  label?: string;
}

export interface Catalog {
  label: string;
  options: CatalogOption[];
}

export type Catalogs = Partial<Record<CatalogKey, Catalog>>;

// === 字段 ===

export interface FieldBase {
  /** 对象成员键；数组元素/映射值等无键场景可省 */
  key?: string;
  label: string;
  help?: string;
  required?: boolean;
}

export interface StringField extends FieldBase {
  kind: 'string';
  multiline?: boolean;
  placeholder?: string;
}

export interface NumberField extends FieldBase {
  kind: 'number';
  int?: boolean;
  min?: number;
}

export interface BoolField extends FieldBase {
  kind: 'boolean';
}

export interface EnumField extends FieldBase {
  kind: 'enum';
  options: readonly string[];
  /** 允许输入选项之外的自由文本（如可扩展的 timing 键） */
  allowFree?: boolean;
}

export interface RefField extends FieldBase {
  kind: 'ref';
  catalog: CatalogKey;
}

export interface IconField extends FieldBase {
  kind: 'icon';
}

/** StatModifier[] 专属编辑器 */
export interface StatModListField extends FieldBase {
  kind: 'statModList';
}

/** 通用映射：Record<key, value>；value 为任意字段（递归） */
export interface MapField extends FieldBase {
  kind: 'map';
  keyLabel: string;
  keyCatalog?: CatalogKey;
  value: Field;
  valueLabel?: string;
}

export interface ObjectField extends FieldBase {
  kind: 'object';
  fields: Field[];
}

export interface ArrayField extends FieldBase {
  kind: 'array';
  item: Field;
  /** 有序数组提供 ↑↓ 排序按钮 */
  ordered?: boolean;
  addLabel?: string;
}

export interface RefListField extends FieldBase {
  kind: 'refList';
  catalog: CatalogKey;
  help?: string;
}

export interface UnionField extends FieldBase {
  kind: 'union';
  discriminator: string;
  variants: Record<string, Field[]>;
  variantLabels?: Record<string, string>;
  /** 切换变体时新分支的补默认值工厂 */
  variantDefaults?: Record<string, () => Record<string, unknown>>;
  addLabel?: string;
  ordered?: boolean;
  /** 作为数组元素使用（如 gate[]/unlock[]）时由 array 包裹，此标记仅供展示 */
  asElement?: boolean;
}

/** 原始 JSON 兜底编辑器（复杂自由形状），支持插入模板片段 */
export interface JsonField extends FieldBase {
  kind: 'json';
  placeholder?: string;
  templates?: { label: string; value: unknown }[];
}

export type Field =
  | StringField
  | NumberField
  | BoolField
  | EnumField
  | RefField
  | IconField
  | StatModListField
  | MapField
  | ObjectField
  | ArrayField
  | RefListField
  | UnionField
  | JsonField;

// === Sheet 描述 ===

export type SheetMode =
  | {
      form: 'rows';
      rowFields: Field[];
      newRow: () => Record<string, unknown>;
      /** 数组顺序有业务含义（如 levels 关底在末位）→ 显示排序按钮 */
      ordered?: boolean;
    }
  | { form: 'keyedRows'; rowFields: Field[]; newRow: () => Record<string, unknown> }
  | { form: 'singleObject'; fields: Field[] }
  | { form: 'stringList'; catalog?: CatalogKey }
  /** 根级映射：整个文件即 Record<key, valueField>（如 talentTrunks/growthByClass） */
  | { form: 'mapRoot'; keyLabel: string; keyCatalog?: CatalogKey; valueLabel?: string; valueField: Field }
  /** 原始 JSON 兜底编辑器（未建模的新文件） */
  | { form: 'rawJson' };

export interface Issue {
  level: 'error' | 'warn';
  path: string; // src/data/...json
  loc: string; // 定位串，如 rows[3].cost 或 (root)
  message: string;
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type JsonDoc = JsonValue;

export interface SheetDef {
  /** 匹配规范化路径 src/data/... */
  pattern: RegExp;
  domain: string;
  /** 静态标题，或按路径动态生成（一实体一文件域） */
  title: string | ((path: string) => string);
  mode: SheetMode;
  /** 表单顶部提示（来自 config-guide 的要点） */
  notes?: string[];
  /** 单文件 bespoke 规则（跨字段校验） */
  sheetRules?: (doc: JsonValue, path: string) => Issue[];
}
