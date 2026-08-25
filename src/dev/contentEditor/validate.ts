/**
 * 校验引擎：schema 驱动的逐字段校验 + 表单级规则 + 跨文件交叉检查。
 * 纯逻辑模块（不依赖 loader / DOM），便于单测。
 */
import { STAT_KEYS } from './enums';
import { docRows, isObj } from './catalogs';
import type { Catalogs, Field, Issue, JsonValue, SheetDef, SheetMode } from './types';

export interface ValidateEnv {
  catalogs: Catalogs;
  /** 相对 sprites 根的切图路径集合 */
  sprites: Set<string>;
  /** 已注册 Lucide iconKey 集合 */
  lucideKeys: Set<string>;
}

export const issue = (level: Issue['level'], path: string, loc: string, message: string): Issue => ({ level, path, loc, message });

interface Ctx extends ValidateEnv {
  path: string;
  out: Issue[];
}

const err = (ctx: Ctx, loc: string, msg: string) => ctx.out.push(issue('error', ctx.path, loc, msg));
const warn = (ctx: Ctx, loc: string, msg: string) => ctx.out.push(issue('warn', ctx.path, loc, msg));

const join = (base: string, key: string): string => (base ? `${base}.${key}` : key);
const idx = (base: string, i: number): string => `${base}[${i}]`;

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === '';

/** 对象成员校验（含必填） */
const walkMember = (fdef: Field, container: Record<string, unknown>, baseLoc: string, ctx: Ctx): void => {
  const key = fdef.key;
  if (!key) return; // 数组元素/映射值等无键字段由 validateValue 直接处理
  const v = container[key];
  if (isEmpty(v)) {
    if (fdef.required) err(ctx, join(baseLoc, key), `缺少必填「${fdef.label}」`);
    return;
  }
  validateValue(fdef, v, join(baseLoc, key), ctx);
};

/** 按字段种类校验值本身 */
export const validateValue = (fdef: Field, v: unknown, loc: string, ctx: Ctx): void => {
  switch (fdef.kind) {
    case 'string':
      if (typeof v !== 'string') err(ctx, loc, `应为字符串`);
      return;
    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        err(ctx, loc, `应为有限数字`);
        return;
      }
      if (fdef.int && !Number.isInteger(v)) err(ctx, loc, `应为整数`);
      if (fdef.min !== undefined && v < fdef.min) err(ctx, loc, `不应小于 ${fdef.min}`);
      return;
    }
    case 'boolean':
      if (typeof v !== 'boolean') err(ctx, loc, `应为布尔值`);
      return;
    case 'enum':
      if (typeof v !== 'string') {
        err(ctx, loc, `应为字符串枚举`);
        return;
      }
      if (!fdef.options.includes(v) && !fdef.allowFree) err(ctx, loc, `"${v}" 不在可选集 [${fdef.options.join(' | ')}]`);
      return;
    case 'ref': {
      if (typeof v !== 'string') {
        err(ctx, loc, `应为引用 id 字符串`);
        return;
      }
      const cat = ctx.catalogs[fdef.catalog];
      if (cat && !cat.options.some((o) => o.id === v)) err(ctx, loc, `「${v}」不在${cat.label}目录中（疑似拼写错误或未创建）`);
      return;
    }
    case 'icon': {
      if (typeof v !== 'string') {
        err(ctx, loc, `icon 应为字符串（切图路径或 iconKey）`);
        return;
      }
      if (v.endsWith('.png')) {
        if (!ctx.sprites.has(v)) err(ctx, loc, `切图不存在：src/assets/sprites/${v}（缺失会导致构建失败）`);
      } else if (!ctx.lucideKeys.has(v)) {
        err(ctx, loc, `未知 iconKey "${v}"（运行时会回退 HelpCircle 并 DEV 告警）`);
      }
      return;
    }
    case 'statModList': {
      if (!Array.isArray(v)) {
        err(ctx, loc, `应为 StatModifier 数组`);
        return;
      }
      v.forEach((m, i) => {
        if (!isObj(m)) {
          err(ctx, idx(loc, i), `应为对象 {stat,kind,value}`);
          return;
        }
        if (!STAT_KEYS.includes(m.stat as never)) err(ctx, idx(loc, i), `stat "${String(m.stat)}" 不在 21 属性全集内`);
        if (m.kind !== 'flat' && m.kind !== 'percent') err(ctx, idx(loc, i), `kind 应为 flat|percent`);
        if (typeof m.value !== 'number' || !Number.isFinite(m.value)) err(ctx, idx(loc, i), `value 应为有限数字`);
      });
      return;
    }
    case 'map': {
      if (!isObj(v)) {
        err(ctx, loc, `应为键控映射对象`);
        return;
      }
      const cat = fdef.keyCatalog ? ctx.catalogs[fdef.keyCatalog] : undefined;
      for (const [k, val] of Object.entries(v)) {
        if (cat && !cat.options.some((o) => o.id === k)) {
          err(ctx, idx(loc, 0), `映射键「${k}」不在${cat.label}目录中`);
        }
        validateValue(fdef.value, val, `${loc}·${k}`, ctx);
      }
      return;
    }
    case 'object': {
      if (!isObj(v)) {
        err(ctx, loc, `应为对象`);
        return;
      }
      for (const sub of fdef.fields) walkMember(sub, v, loc, ctx);
      return;
    }
    case 'array': {
      if (!Array.isArray(v)) {
        err(ctx, loc, `应为数组`);
        return;
      }
      v.forEach((item, i) => validateValue(fdef.item, item, idx(loc, i), ctx));
      return;
    }
    case 'refList': {
      if (!Array.isArray(v)) {
        err(ctx, loc, `应为 id 数组`);
        return;
      }
      const cat = ctx.catalogs[fdef.catalog];
      v.forEach((id, i) => {
        if (typeof id !== 'string') {
          err(ctx, idx(loc, i), `应为 id 字符串`);
          return;
        }
        if (cat && !cat.options.some((o) => o.id === id)) err(ctx, idx(loc, i), `「${id}」不在${cat.label}目录中`);
      });
      if (cat) {
        const seen = new Set<string>();
        for (const id of v) {
          if (typeof id === 'string') {
            if (seen.has(id)) warn(ctx, loc, `存在重复引用「${id}」`);
            seen.add(id);
          }
        }
      }
      return;
    }
    case 'union': {
      if (!isObj(v)) {
        err(ctx, loc, `应为对象（判别键 ${fdef.discriminator}）`);
        return;
      }
      const variant = v[fdef.discriminator];
      if (typeof variant !== 'string' || !(variant in fdef.variants)) {
        err(ctx, loc, `判别键 ${fdef.discriminator} 缺失或非法（可选：${Object.keys(fdef.variants).join(' | ')}）`);
        return;
      }
      for (const sub of fdef.variants[variant]) walkMember(sub, v, loc, ctx);
      return;
    }
    case 'json':
      return; // 编辑器只在解析成功后写回，解析态由 UI 提示
  }
};

/** 行级未知键提醒（帮助发现手滑拼错的字段名） */
const warnUnknownKeys = (row: Record<string, unknown>, fields: Field[], loc: string, ctx: Ctx): void => {
  const known = new Set(fields.map((x) => x.key).filter((k): k is string => k !== undefined));
  for (const k of Object.keys(row)) {
    if (!known.has(k)) warn(ctx, join(loc, k), `字段不在表单模型中（保留原样输出；若是新字段请扩展编辑器模型，若为手误请修正）`);
  }
};

/** 单文档校验入口 */
export const validateDoc = (path: string, doc: JsonValue, def: SheetDef, env: ValidateEnv): Issue[] => {
  const ctx: Ctx = { ...env, path, out: [] };
  const mode: SheetMode = def.mode;

  if (mode.form === 'rows' || mode.form === 'keyedRows') {
    const { rowFields } = mode;
    if (mode.form === 'rows') {
      if (!Array.isArray(doc)) {
        err(ctx, '', '本表为行数组形态（新内容规范），当前文件不是数组——请用行数组形态或先迁移');
        return ctx.out;
      }
      const seen = new Map<string, number>();
      doc.forEach((rawRow, i) => {
        const loc = idx('rows', i);
        if (!isObj(rawRow)) {
          err(ctx, loc, `行应为对象`);
          return;
        }
        const id = rawRow.id;
        if (isEmpty(id)) {
          err(ctx, join(loc, 'id'), `缺少必填「id」（行数组形态下 id 即身份、必填且全域唯一）`);
        } else if (typeof id === 'string') {
          if (seen.has(id)) err(ctx, join(loc, 'id'), `id「${id}」与第 ${seen.get(id)} 行重复`);
          else seen.set(id, i);
        }
        warnUnknownKeys(rawRow, rowFields, loc, ctx);
        for (const fdef of rowFields) walkMember(fdef, rawRow, loc, ctx);
      });
    } else {
      if (!isObj(doc)) {
        err(ctx, '', '本表为键控 map 形态（key 必须等于行内 id），当前文件不是对象');
        return ctx.out;
      }
      for (const [key, rawRow] of Object.entries(doc)) {
        const loc = `rows["${key}"]`;
        if (!isObj(rawRow)) {
          err(ctx, loc, `行应为对象`);
          continue;
        }
        if (!isEmpty(rawRow.id) && rawRow.id !== key) {
          err(ctx, join(loc, 'id'), `行内 id「${String(rawRow.id)}」与键「${key}」不一致（键控表要求 key === id）`);
        }
        warnUnknownKeys(rawRow, rowFields, loc, ctx);
        for (const fdef of rowFields) walkMember(fdef, rawRow, loc, ctx);
      }
    }
  } else if (mode.form === 'singleObject') {
    if (!isObj(doc)) {
      err(ctx, '', '本表为单对象形态，当前文件根不是对象');
      return ctx.out;
    }
    warnUnknownKeys(doc, mode.fields, '', ctx);
    for (const fdef of mode.fields) walkMember(fdef, doc, '', ctx);
  } else if (mode.form === 'mapRoot') {
    if (!isObj(doc)) {
      err(ctx, '', '本表为根级键控映射（Record<key, value>），当前文件根不是对象');
      return ctx.out;
    }
    const cat = mode.keyCatalog ? env.catalogs[mode.keyCatalog] : undefined;
    for (const [k, v] of Object.entries(doc)) {
      if (cat && !cat.options.some((o) => o.id === k)) err(ctx, k, `映射键「${k}」不在${cat.label}目录中`);
      validateValue(mode.valueField, v, k, ctx);
    }
  } else if (mode.form === 'stringList') {
    // stringList
    if (!Array.isArray(doc)) {
      err(ctx, '', '本表为字符串数组形态');
      return ctx.out;
    }
    const cat = mode.catalog ? env.catalogs[mode.catalog] : undefined;
    const seen = new Set<string>();
    doc.forEach((id, i) => {
      if (typeof id !== 'string') {
        err(ctx, idx('', i), `应为字符串`);
        return;
      }
      if (seen.has(id)) warn(ctx, idx('', i), `重复项「${id}」`);
      seen.add(id);
      if (cat && !cat.options.some((o) => o.id === id)) err(ctx, idx('', i), `「${id}」不在${cat.label}目录中`);
    });
  }

  def.sheetRules?.(doc, path).forEach((x) => ctx.out.push(x));
  return ctx.out;
};

// === 跨文件交叉检查 ===

/** levels.enemies ⊆ 同区域 enemyPool；realityOrder 完整性；英雄碎片勿手写提醒 */
export const crossChecks = (docs: Record<string, JsonValue>): Issue[] => {
  const out: Issue[] = [];
  const mk = (level: Issue['level'], path: string, loc: string, message: string) => out.push(issue(level, path, loc, message));

  for (const [p, doc] of Object.entries(docs)) {
    const m = /^src\/data\/regions\/([^/]+)\/levels\.json$/.exec(p);
    if (!m) continue;
    const infoPath = `src/data/regions/${m[1]}/regionInfo.json`;
    const info = docs[infoPath];
    // regionInfo 是单对象形态：直接读 enemyPool 字段
    const rawPool = isObj(info) && Array.isArray(info.enemyPool) ? info.enemyPool : [];
    const pool = new Set<string>(rawPool.filter((x): x is string => typeof x === 'string'));
    if (Array.isArray(doc)) {
      doc.forEach((row, i) => {
        if (!isObj(row) || !Array.isArray(row.enemies)) return;
        row.enemies.forEach((eid: unknown, j: number) => {
          if (typeof eid === 'string' && !pool.has(eid)) {
            mk('error', p, `[${i}].enemies[${j}]`, `敌人「${eid}」不在所在区域 ${m[1]} 的 enemyPool 中（levels.enemies 必须 ⊆ enemyPool）`);
          }
        });
      });
    }
  }

  // realityOrder 登记完整性
  const realityIds = new Set<string>();
  for (const [p, doc] of Object.entries(docs)) {
    if (!/^src\/data\/events\/reality_[a-z]+\.json$/.test(p)) continue;
    for (const row of docRows(doc)) {
      const id = row.id;
      if (typeof id === 'string') realityIds.add(id);
    }
  }
  const order = docs['src/data/events/realityOrder.json'];
  if (Array.isArray(order)) {
    const listed = new Set(order.filter((x): x is string => typeof x === 'string'));
    const missing = [...realityIds].filter((id) => !listed.has(id));
    if (missing.length > 0) {
      mk('warn', 'src/data/events/realityOrder.json', '', `以下现实事件未登记发布序（将排尾部）：${missing.join('、')}`);
    }
  }

  // 英雄碎片派生提醒
  const shards = docs['src/data/items/shards.json'];
  for (const row of docRows(shards)) {
    const id = row.id;
    if (typeof id === 'string' && /^shard_.+/.test(id)) {
      mk(
        'warn',
        'src/data/items/shards.json',
        `rows["${id}"]`,
        `英雄灵魂碎片（shard_<heroId>）由 items.loader 自动派生，请勿手写；shards.json 仅保留通用碎片`
      );
    }
  }
  return out;
};
