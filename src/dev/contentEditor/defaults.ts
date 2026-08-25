/** 新增行/条目/映射项的默认值工厂 */
import type { Field } from './types';

const firstVariant = (field: Extract<Field, { kind: 'union' }>): Record<string, unknown> => {
  const name = Object.keys(field.variants)[0] ?? '';
  const seeded = field.variantDefaults?.[name]?.() ?? {};
  return { [field.discriminator]: name, ...seeded };
};

export const defaultValue = (field: Field): unknown => {
  switch (field.kind) {
    case 'string':
    case 'ref':
    case 'icon':
    case 'json':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'enum':
      return field.options[0] ?? '';
    case 'statModList':
    case 'array':
    case 'refList':
    case 'map':
      return field.kind === 'map' ? {} : [];
    case 'object':
      // 仅播种必填成员，避免把一堆空可选字段写进 json
      return Object.fromEntries(field.fields.filter((x) => x.required && x.key).map((x) => [x.key as string, defaultValue(x)]));
    case 'union':
      return firstVariant(field);
  }
};
