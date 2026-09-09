/**
 * schema 驱动的字段编辑器集：标量输入、引用/枚举下拉、图标选择、
 * 属性修饰符表、映射、对象网格、数组卡片、判别联合、原始 JSON。
 * 通过 EditorContext 传递目录表，避免逐层 props。
 */
import React, { useEffect, useRef, useState } from 'react';
import { defaultValue } from '../defaults';
import { setMember } from '../editUtils';
import type { CatalogOption, Field } from '../types';
import { Combobox } from './Combobox';
import { IconPicker, IconPreview } from './IconPicker';
import { Btn, FieldShell, inputCls } from './primitives';
import { useCatalogs } from './catalogContext';

const asOptions = (list: readonly string[]): CatalogOption[] => list.map((id) => ({ id }));

// === 标量 ===

const StringInput: React.FC<{ field: Extract<Field, { kind: 'string' }>; value: unknown; onChange: (v: unknown) => void }> = ({
  field,
  value,
  onChange
}) =>
  field.multiline ? (
    <textarea className={`${inputCls} min-h-16 leading-relaxed`} value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className={inputCls} value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
  );

const NumberInput: React.FC<{ field: Extract<Field, { kind: 'number' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => (
  <input
    type="number"
    step={field.int ? 1 : 'any'}
    className={`${inputCls} font-mono`}
    value={typeof value === 'number' && Number.isFinite(value) ? value : ''}
    onChange={(e) => {
      const raw = e.target.value;
      if (raw === '') {
        onChange(undefined);
        return;
      }
      const n = field.int ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
      if (!Number.isNaN(n)) onChange(n);
    }}
  />
);

// === 图标 ===

const IconInput: React.FC<{ value: unknown; onChange: (v: unknown) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
        <IconPreview value={value} size={24} />
      </div>
      <input className={`${inputCls} font-mono flex-1`} value={typeof value === 'string' ? value : ''} placeholder="items/…/x.png 或 iconKey" onChange={(e) => onChange(e.target.value)} />
      <Btn onClick={() => setOpen(true)} title="打开选择器">选择</Btn>
      <Btn tone="ghost" onClick={() => onChange('')} title="清空">✕</Btn>
      <IconPicker open={open} value={typeof value === 'string' ? value : ''} onClose={() => setOpen(false)} onSelect={(v) => onChange(v)} />
    </div>
  );
};

// === StatModifier 列表 ===

const StatModListEditor: React.FC<{ value: unknown; onChange: (v: unknown) => void }> = ({ value, onChange }) => {
  const catalogs = useCatalogs();
  const list = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  const statOptions = catalogs.stat?.options ?? [];
  const update = (i: number, patch: Record<string, unknown>) => onChange(list.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {list.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1.5">
          <span className="text-[9px] text-zinc-600 font-black w-4">{i + 1}</span>
          <div className="w-44"><Combobox value={m.stat} options={statOptions} onChange={(v) => update(i, { stat: v })} placeholder="属性" /></div>
          <div className="w-28">
            <Combobox value={m.kind} options={asOptions(['flat', 'percent'])} onChange={(v) => update(i, { kind: v })} placeholder="flat/percent" />
          </div>
          <input
            type="number"
            step="any"
            className={`${inputCls} font-mono w-24`}
            value={typeof m.value === 'number' ? m.value : ''}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value);
              if (!Number.isNaN(n)) update(i, { value: n });
            }}
          />
          <input className={`${inputCls} flex-1`} placeholder="来源标注 source（可省）" value={typeof m.source === 'string' ? m.source : ''} onChange={(e) => update(i, { source: e.target.value || undefined })} />
          {list.length > 1 && (
            <Btn tone="ghost" onClick={() => move(i, -1)} title="上移">↑</Btn>
          )}
          {list.length > 1 && (
            <Btn tone="ghost" onClick={() => move(i, 1)} title="下移">↓</Btn>
          )}
          <Btn tone="danger" onClick={() => onChange(list.filter((_, j) => j !== i))}>删除</Btn>
        </div>
      ))}
      <Btn tone="primary" className="self-start" onClick={() => onChange([...list, { stat: 'attack', kind: 'flat', value: 0 }])}>
        + 修饰符
      </Btn>
      <p className="text-[9px] text-zinc-600">percent 传小数（0.1 = +10%）；flat 传绝对值；多来源加算。</p>
    </div>
  );
};

// === 映射 Record<key, valueField> ===

const renameMapKey = (obj: Record<string, unknown>, from: string, to: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).flatMap(([k, v]) => (k === from ? [[to, v]] : [[k, v]])));

export const MapEditor: React.FC<{ field: Extract<Field, { kind: 'map' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const catalogs = useCatalogs();
  const obj = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const keyCat = field.keyCatalog ? catalogs[field.keyCatalog] : undefined;
  const [newKey, setNewKey] = useState('');
  const complexValue = ['object', 'union', 'map', 'array', 'statModList', 'json'].includes(field.value.kind);

  return (
    <div className="flex flex-col gap-1.5">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex items-start gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1.5">
          <div className={complexValue ? 'w-48 shrink-0' : 'w-48 shrink-0 self-center'}>
            {keyCat ? (
              <Combobox value={k} options={keyCat.options} onChange={(nk) => nk && nk !== k && onChange(renameMapKey(obj, k, nk))} placeholder={field.keyLabel} />
            ) : (
              <input
                className={`${inputCls} font-mono`}
                value={k}
                onChange={(e) => e.target.value && onChange(renameMapKey(obj, k, e.target.value))}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">{complexValue ? <FieldInput field={{ ...field.value, label: `${k}` }} value={v} onChange={(nv) => onChange(setMember(obj, k, nv))} /> : (
            <div className="flex items-center gap-2">
              <FieldInput field={field.value} value={v} onChange={(nv) => onChange(setMember(obj, k, nv))} />
            </div>
          )}</div>
          <div className="self-center"><Btn tone="danger" onClick={() => onChange(setMember(obj, k, undefined))}>×</Btn></div>
        </div>
      ))}
      <div className="flex gap-1.5 items-center">
        <div className="w-48">
          {keyCat ? (
            <Combobox value="" options={keyCat.options.filter((o) => !(o.id in obj))} onChange={(v) => v && onChange({ ...obj, [v]: defaultValue(field.value) })} placeholder={`新增${field.keyLabel}…`} />
          ) : (
            <input className={`${inputCls} font-mono`} placeholder={`新增${field.keyLabel}…`} value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          )}
        </div>
        {!keyCat && (
          <Btn
            tone="primary"
            disabled={!newKey.trim()}
            onClick={() => {
              const k = newKey.trim();
              if (!k || k in obj) return;
              onChange({ ...obj, [k]: defaultValue(field.value) });
              setNewKey('');
            }}
          >
            + 添加
          </Btn>
        )}
      </div>
    </div>
  );
};

// === 对象网格 ===

export const FieldGrid: React.FC<{ fields: Field[]; doc: Record<string, unknown>; onChangeDoc: (next: Record<string, unknown>) => void }> = ({
  fields,
  doc,
  onChangeDoc
}) => {
  const wide = (x: Field): boolean =>
    (x.kind === 'string' && !!x.multiline) ||
    x.kind === 'json' ||
    x.kind === 'statModList' ||
    x.kind === 'array' ||
    x.kind === 'refList' ||
    x.kind === 'map' ||
    x.kind === 'object' ||
    x.kind === 'union';
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((x) =>
        x.key ? (
          <FieldShell key={x.key} label={x.label} help={x.help} required={x.required} wide={wide(x)}>
            <FieldInput field={x} value={doc[x.key]} onChange={(v) => onChangeDoc(setMember(doc, x.key as string, v))} />
          </FieldShell>
        ) : null
      )}
    </div>
  );
};

const ObjectEditor: React.FC<{ field: Extract<Field, { kind: 'object' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const obj = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return (
    <div className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/40">
      <FieldGrid fields={field.fields} doc={obj} onChangeDoc={(next) => onChange(next)} />
    </div>
  );
};

// === 数组 / 引用列表 ===

const scalarKinds = new Set(['string', 'number', 'boolean', 'enum', 'ref', 'icon']);

const ArrayEditor: React.FC<{ field: Extract<Field, { kind: 'array' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const arr = Array.isArray(value) ? (value as unknown[]) : [];
  const itemScalar = scalarKinds.has(field.item.kind);
  const update = (i: number, v: unknown) => onChange(arr.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...arr];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  if (itemScalar) {
    return (
      <div className="flex flex-wrap gap-1.5 items-start">
        {arr.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg pl-1 pr-1 py-1">
            <FieldInput field={field.item} value={v} onChange={(nv) => update(i, nv)} />
            {field.ordered && (
              <>
                <button className="text-zinc-500 hover:text-zinc-200 text-[10px] cursor-pointer" onClick={() => i > 0 && move(i, -1)}>↑</button>
                <button className="text-zinc-500 hover:text-zinc-200 text-[10px] cursor-pointer" onClick={() => i < arr.length - 1 && move(i, 1)}>↓</button>
              </>
            )}
            <button className="text-zinc-500 hover:text-rose-400 text-xs px-0.5 cursor-pointer" onClick={() => onChange(arr.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        <Btn tone="primary" onClick={() => onChange([...arr, defaultValue(field.item)])}>
          {field.addLabel ?? '+ 添加'}
        </Btn>
      </div>
    );
  }
  const toggleCollapsed = (i: number): void =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <div className="flex flex-col gap-1.5">
      {arr.map((v, i) => {
        const isCollapsed = collapsed.has(i);
        const summary =
          v && typeof v === 'object' && !Array.isArray(v)
            ? String((v as Record<string, unknown>).name ?? (v as Record<string, unknown>).title ?? (v as Record<string, unknown>).kind ?? (v as Record<string, unknown>).timing ?? '')
            : '';
        return (
          <div key={i} className="border border-zinc-800 rounded-xl bg-zinc-950/60 overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/60">
              <button className="text-[10px] font-black text-zinc-400 hover:text-zinc-100 cursor-pointer flex-1 text-left truncate" onClick={() => toggleCollapsed(i)}>
                {isCollapsed ? '▸' : '▾'} #{i + 1} {summary && <span className="text-purple-300 ml-1">{summary}</span>}
              </button>
              {field.ordered && (
                <>
                  <Btn tone="ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</Btn>
                  <Btn tone="ghost" disabled={i === arr.length - 1} onClick={() => move(i, 1)}>↓</Btn>
                </>
              )}
              <Btn tone="danger" onClick={() => onChange(arr.filter((_, j) => j !== i))}>删除</Btn>
            </div>
            {!isCollapsed && (
              <div className="p-2">
                <FieldInput field={field.item} value={v} onChange={(nv) => update(i, nv)} />
              </div>
            )}
          </div>
        );
      })}
      <Btn tone="primary" className="self-start" onClick={() => onChange([...arr, defaultValue(field.item)])}>
        {field.addLabel ?? '+ 添加'}
      </Btn>
    </div>
  );
};

const RefListEditor: React.FC<{ field: Extract<Field, { kind: 'refList' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const catalogs = useCatalogs();
  const cat = catalogs[field.catalog];
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const move = (i: number, d: -1 | 1) => {
    const next = [...arr];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {arr.map((id, i) => {
          const opt = cat?.options.find((o) => o.id === id);
          return (
            <span key={`${id}-${i}`} className="inline-flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg px-1.5 py-1 text-[11px] font-mono text-zinc-300">
              {id}
              {opt?.label && <span className="text-zinc-500 font-sans">· {opt.label}</span>}
              <button className="text-zinc-500 hover:text-zinc-200 text-[10px] cursor-pointer" onClick={() => i > 0 && move(i, -1)}>↑</button>
              <button className="text-zinc-500 hover:text-zinc-200 text-[10px] cursor-pointer" onClick={() => i < arr.length - 1 && move(i, 1)}>↓</button>
              <button className="text-zinc-500 hover:text-rose-400 cursor-pointer" onClick={() => onChange(arr.filter((_, j) => j !== i))}>×</button>
            </span>
          );
        })}
        {arr.length === 0 && <span className="text-[10px] text-zinc-600">（空）</span>}
      </div>
      <div className="max-w-sm">
        <Combobox
          value=""
          options={(cat?.options ?? []).filter((o) => !arr.includes(o.id))}
          placeholder="+ 添加引用…"
          onChange={(v) => v && onChange([...arr, v])}
        />
      </div>
    </div>
  );
};

// === 判别联合 ===

const UnionEditor: React.FC<{ field: Extract<Field, { kind: 'union' }>; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const variantNames = Object.keys(field.variants);
  const current = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const active = typeof current[field.discriminator] === 'string' && variantNames.includes(current[field.discriminator] as string) ? (current[field.discriminator] as string) : variantNames[0];
  const options: CatalogOption[] = variantNames.map((v) => ({ id: v, label: field.variantLabels?.[v] }));
  const switchVariant = (nv: string): void => {
    const keepKeys = new Set([field.discriminator, ...field.variants[nv].map((x) => x.key).filter((k): k is string => !!k)]);
    const kept = Object.fromEntries(Object.entries(current).filter(([k]) => keepKeys.has(k)));
    const seeded = field.variantDefaults?.[nv]?.() ?? {};
    onChange({ ...seeded, ...kept, [field.discriminator]: nv });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="w-56">
        <Combobox value={active} options={options} onChange={switchVariant} />
      </div>
      <div className="border-l-2 border-purple-500/30 pl-3">
        <FieldGrid fields={field.variants[active]} doc={current} onChangeDoc={onChange} />
      </div>
    </div>
  );
};

// === 原始 JSON ===

export const JsonArea: React.FC<{ value: unknown; onChange: (v: unknown) => void; placeholder?: string; templates?: { label: string; value: unknown }[]; minHeight?: number }> = ({
  value,
  onChange,
  placeholder,
  templates,
  minHeight = 120
}) => {
  const pretty = (v: unknown): string => (v === undefined || v === '' ? '' : JSON.stringify(v, null, 2));
  const [buf, setBuf] = useState(() => pretty(value));
  const propagated = useRef<unknown>(value);
  useEffect(() => {
    if (propagated.current !== value) {
      setBuf(pretty(value));
      propagated.current = value;
    }
  }, [value]);
  let parseError = '';
  let parsed: unknown = undefined;
  try {
    parsed = buf.trim() === '' ? undefined : JSON.parse(buf);
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }
  const propagate = (text: string): void => {
    setBuf(text);
    try {
      const p = text.trim() === '' ? undefined : JSON.parse(text);
      parseError = '';
      propagated.current = p;
      onChange(p);
    } catch {
      /* 保持本地缓冲，不传播 */
    }
  };
  return (
    <div className="flex flex-col gap-1">
      {templates && templates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {templates.map((t) => (
            <button key={t.label} onClick={() => propagate(JSON.stringify(t.value, null, 2))} className="px-1.5 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[9px] font-bold text-cyan-300 cursor-pointer">
              + {t.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        className={`${inputCls} font-mono leading-relaxed ${parseError ? 'border-red-500/60 focus:border-red-500' : ''}`}
        style={{ minHeight }}
        spellCheck={false}
        value={buf}
        placeholder={placeholder}
        onChange={(e) => propagate(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className={`text-[9px] ${parseError ? 'text-red-400' : buf.trim() === '' ? 'text-zinc-600' : 'text-emerald-500'}`}>
          {parseError ? `JSON 解析失败：${parseError}` : buf.trim() === '' ? '（空 = 未配置）' : '✓ JSON 有效'}
        </span>
        <Btn tone="ghost" disabled={!!parseError || buf.trim() === ''} onClick={() => propagate(pretty(parsed))}>
          格式化
        </Btn>
      </div>
    </div>
  );
};

// === 分发入口 ===

export const FieldInput: React.FC<{ field: Field; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  const catalogs = useCatalogs();
  switch (field.kind) {
    case 'string':
      return <StringInput field={field} value={value} onChange={onChange} />;
    case 'number':
      return <NumberInput field={field} value={value} onChange={onChange} />;
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded bg-zinc-900 border-zinc-800 cursor-pointer" />
          <span className="text-[11px] text-zinc-300">{value === true ? '是' : '否'}</span>
        </label>
      );
    case 'enum':
      return <Combobox value={value} options={asOptions(field.options)} allowFree={field.allowFree} onChange={onChange} />;
    case 'ref': {
      const cat = catalogs[field.catalog];
      return <Combobox value={value} options={cat?.options ?? []} onChange={onChange} placeholder={`查找${cat?.label ?? ''}…`} />;
    }
    case 'icon':
      return <IconInput value={value} onChange={onChange} />;
    case 'statModList':
      return <StatModListEditor value={value} onChange={onChange} />;
    case 'map':
      return <MapEditor field={field} value={value} onChange={onChange} />;
    case 'object':
      return <ObjectEditor field={field} value={value} onChange={onChange} />;
    case 'array':
      return <ArrayEditor field={field} value={value} onChange={onChange} />;
    case 'refList':
      return <RefListEditor field={field} value={value} onChange={onChange} />;
    case 'union':
      return <UnionEditor field={field} value={value} onChange={onChange} />;
    case 'json':
      return <JsonArea value={value} onChange={onChange} placeholder={field.placeholder} templates={field.templates} />;
  }
};
