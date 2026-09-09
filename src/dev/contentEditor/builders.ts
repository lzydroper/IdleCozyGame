/**
 * 字段构建助手：让各域 schema 声明保持紧凑。
 */
import type {
  ArrayField,
  BoolField,
  CatalogKey,
  EnumField,
  Field,
  FieldBase,
  IconField,
  JsonField,
  MapField,
  NumberField,
  ObjectField,
  RefField,
  RefListField,
  StatModListField,
  UnionField
} from './types';

type Opt = Omit<FieldBase, 'label'>;

const base = (key: string, label: string, opt?: Opt): FieldBase & { key: string } => ({
  key,
  label,
  ...opt
});

export const f = {
  string: (
    key: string,
    label: string,
    opt?: Opt & Partial<Pick<Extract<Field, { kind: 'string' }>, 'multiline' | 'placeholder'>>
  ): Extract<Field, { kind: 'string' }> => ({ kind: 'string', ...base(key, label, opt), ...(opt ?? {}) }),
  number: (key: string, label: string, opt?: Opt & Partial<Pick<NumberField, 'int' | 'min'>>): NumberField =>
    ({ kind: 'number', ...base(key, label, opt), ...(opt ?? {}) }),
  boolean: (key: string, label: string, opt?: Opt): BoolField => ({ kind: 'boolean', ...base(key, label, opt), ...(opt ?? {}) }),
  enum: (key: string, label: string, options: readonly string[], opt?: Opt & Partial<Pick<EnumField, 'allowFree'>>): EnumField =>
    ({ kind: 'enum', options, ...base(key, label, opt), ...(opt ?? {}) }),
  ref: (key: string, label: string, catalog: CatalogKey, opt?: Opt): RefField =>
    ({ kind: 'ref', catalog, ...base(key, label, opt), ...(opt ?? {}) }),
  icon: (key: string, label: string, opt?: Opt): IconField => ({ kind: 'icon', ...base(key, label, opt), ...(opt ?? {}) }),
  statModList: (key: string, label: string, opt?: Opt): StatModListField =>
    ({ kind: 'statModList', ...base(key, label, opt), ...(opt ?? {}) }),
  map: (
    key: string,
    label: string,
    value: MapField['value'],
    opt?: Opt & Partial<Pick<MapField, 'keyLabel' | 'keyCatalog' | 'valueLabel'>>
  ): MapField => ({ kind: 'map', keyLabel: '键', value, ...base(key, label, opt), ...(opt ?? {}) }),
  object: (key: string, label: string, fields: Field[], opt?: Opt): ObjectField =>
    ({ kind: 'object', fields, ...base(key, label, opt), ...(opt ?? {}) }),
  array: (key: string, label: string, item: Field, opt?: Opt & Partial<Pick<ArrayField, 'ordered' | 'addLabel'>>): ArrayField =>
    ({ kind: 'array', item, ...base(key, label, opt), ...(opt ?? {}) }),
  refList: (key: string, label: string, catalog: CatalogKey, opt?: Opt): RefListField =>
    ({ kind: 'refList', catalog, ...base(key, label, opt), ...(opt ?? {}) }),
  union: (
    key: string,
    label: string,
    discriminator: string,
    variants: UnionField['variants'],
    opt?: Opt & Partial<Pick<UnionField, 'variantLabels' | 'variantDefaults' | 'addLabel' | 'ordered'>>
  ): UnionField => ({ kind: 'union', discriminator, variants, ...base(key, label, opt), ...(opt ?? {}) }),
  json: (key: string, label: string, opt?: Opt & Partial<Pick<JsonField, 'placeholder' | 'templates'>>): JsonField =>
    ({ kind: 'json', ...base(key, label, opt), ...(opt ?? {}) })
};
