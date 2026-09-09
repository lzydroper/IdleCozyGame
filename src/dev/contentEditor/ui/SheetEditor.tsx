/**
 * 单文件编辑面：按 SheetMode 分发（行数组/键控表/单对象/字符串清单/根级映射/原始 JSON）。
 */
import React, { useEffect, useState } from 'react';
import type { Catalogs, Field, JsonValue, SheetMode } from '../types';
import { resolveSheet } from '../sheetRegistry';
import { deepClone } from '../editUtils';
import { Combobox } from './Combobox';
import { FieldGrid, JsonArea, MapEditor } from './fields';
import { IconPreview } from './IconPicker';
import { useCatalogs } from './catalogContext';
import { Badge, Btn, inputCls } from './primitives';

const rowTitle = (row: Record<string, unknown>): string => {
  for (const k of ['name', 'title', 'displayName', 'awakenedName', 'buffId', 'id']) {
    const v = row[k];
    if (typeof v === 'string' && v) return v;
  }
  return '(未命名)';
};

const NotesBar: React.FC<{ notes?: string[] }> = ({ notes }) =>
  notes && notes.length > 0 ? (
    <div className="flex flex-col gap-1 mb-1">
      {notes.map((n, i) => (
        <div key={i} className="text-[10px] text-cyan-300/80 bg-cyan-950/20 border border-cyan-500/20 rounded-lg px-2.5 py-1.5">
          ℹ {n}
        </div>
      ))}
    </div>
  ) : null;

// === 行卡片 ===

interface RowCardProps {
  index: number;
  count: number;
  row: Record<string, unknown>;
  rowFields: Field[];
  onChangeRow: (next: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove?: (d: -1 | 1) => void;
  headerExtra?: React.ReactNode;
  /** 问题面板定位信号：等于本行索引时自动展开 */
  expandSignal?: number | null;
}

const RowCard: React.FC<RowCardProps> = ({ index, count, row, rowFields, onChangeRow, onDelete, onDuplicate, onMove, headerExtra, expandSignal }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (expandSignal != null && expandSignal === index) setOpen(true);
  }, [expandSignal, index]);
  return (
    <div id={`row-${index}`} className="border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden scroll-mt-4">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button onClick={() => setOpen((x) => !x)} className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer group">
          <span className="text-[10px] font-mono text-zinc-600 w-8 shrink-0">#{String(index + 1).padStart(2, '0')}</span>
          {'icon' in row && typeof row.icon === 'string' ? <IconPreview value={row.icon} size={22} /> : null}
          <span className="text-xs font-black text-zinc-200 truncate group-hover:text-purple-300">{rowTitle(row)}</span>
          <span className="text-[10px] font-mono text-zinc-500 truncate">{typeof row.id === 'string' ? row.id : ''}</span>
        </button>
        {headerExtra}
        {onMove && (
          <>
            <Btn tone="ghost" disabled={index === 0} onClick={() => onMove(-1)} title="上移">↑</Btn>
            <Btn tone="ghost" disabled={index >= count - 1} onClick={() => onMove(1)} title="下移">↓</Btn>
          </>
        )}
        <Btn tone="ghost" onClick={onDuplicate} title="复制一行">复制</Btn>
        <Btn tone="danger" onClick={onDelete}>删除</Btn>
        <Btn tone="primary" onClick={() => setOpen((x) => !x)}>{open ? '收起' : '编辑'}</Btn>
      </div>
      {open && (
        <div className="p-3 border-t border-zinc-800/80">
          <FieldGrid fields={rowFields} doc={row} onChangeDoc={onChangeRow} />
        </div>
      )}
    </div>
  );
};

// === 主分发 ===

export const SheetEditor: React.FC<{ path: string; doc: JsonValue; onChangeDoc: (next: JsonValue) => void; focusRow: number | null }> = ({
  path,
  doc,
  onChangeDoc,
  focusRow
}) => {
  const resolved = resolveSheet(path);
  const mode = resolved.def.mode;

  useEffect(() => {
    if (focusRow !== null && mode.form === 'rows') {
      document.getElementById(`row-${focusRow}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusRow, mode.form]);

  return (
    <div className="flex flex-col gap-3">
      <NotesBar notes={resolved.def.notes} />
      {(mode.form === 'rows' || mode.form === 'keyedRows') && (
        <RowsEditor key={`${path}-${mode.form}`} mode={mode} doc={doc} onChangeDoc={onChangeDoc} expandSignal={mode.form === 'rows' ? focusRow : null} />
      )}
      {mode.form === 'singleObject' && <SingleObjectEditor fields={mode.fields} doc={doc} onChangeDoc={(next) => onChangeDoc(next as JsonValue)} />}
      {mode.form === 'stringList' && <StringListEditor mode={mode} doc={doc} onChangeDoc={onChangeDoc} />}
      {mode.form === 'mapRoot' && <MapRootEditor mode={mode} doc={doc} onChangeDoc={onChangeDoc} />}
      {mode.form === 'rawJson' && <JsonArea value={doc} onChange={(v) => onChangeDoc((v ?? null) as JsonValue)} minHeight={420} placeholder="直接编辑 JSON" />}
    </div>
  );
};

// === 行数组 / 键控表 ===

type RowsMode = Extract<SheetMode, { form: 'rows' | 'keyedRows' }>;

const RowsEditor: React.FC<{ mode: RowsMode; doc: JsonValue; onChangeDoc: (next: JsonValue) => void; expandSignal?: number | null }> = ({
  mode,
  doc,
  onChangeDoc,
  expandSignal
}) => {
  const [newKey, setNewKey] = useState('');

  if (mode.form === 'rows') {
    const rows = Array.isArray(doc) ? (doc as Record<string, unknown>[]) : [];
    const mutate = (next: Record<string, unknown>[]): void => onChangeDoc(next as unknown as JsonValue);
    return (
      <>
        <div className="flex items-center gap-2">
          <Btn tone="primary" onClick={() => mutate([...rows, deepClone(mode.newRow())])}>
            + 新增行
          </Btn>
          <span className="text-[10px] text-zinc-500">{rows.length} 行</span>
          {mode.ordered && <Badge tone="dirty">有序表（↑↓ 调整）</Badge>}
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <RowCard
              key={i}
              index={i}
              count={rows.length}
              row={row}
              rowFields={mode.rowFields}
              expandSignal={expandSignal}
              onChangeRow={(next) => mutate(rows.map((r, j) => (j === i ? next : r)))}
              onDelete={() => mutate(rows.filter((_, j) => j !== i))}
              onDuplicate={() => {
                const clone = deepClone(row);
                const next = [...rows];
                next.splice(i + 1, 0, clone);
                mutate(next);
              }}
              onMove={
                mode.ordered
                  ? (d) => {
                      const next = [...rows];
                      const [x] = next.splice(i, 1);
                      next.splice(i + d, 0, x);
                      mutate(next);
                    }
                  : undefined
              }
            />
          ))}
          {rows.length === 0 && <div className="text-center text-[11px] text-zinc-600 py-10">空表——点「+ 新增行」开始</div>}
        </div>
      </>
    );
  }

  // keyedRows
  const base = doc && typeof doc === 'object' && !Array.isArray(doc) ? (doc as Record<string, unknown>) : {};
  const entries = Object.entries(base);
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <input className={`${inputCls} font-mono w-56`} placeholder="新条目 id / 键名…" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <Btn
          tone="primary"
          disabled={!newKey.trim() || newKey.trim() in base}
          title={newKey.trim() && newKey.trim() in base ? '该键已存在' : '追加到末尾'}
          onClick={() => {
            const k = newKey.trim();
            if (!k || k in base) return;
            onChangeDoc({ ...base, [k]: mode.newRow() } as unknown as JsonValue);
            setNewKey('');
          }}
        >
          + 新增条目
        </Btn>
        <span className="text-[10px] text-zinc-500">{entries.length} 条 · 键控 map 形态（key 必须等于行内 id）</span>
      </div>
      <div className="flex flex-col gap-2">
        {entries.map(([key, rawRow], i) => {
          const row = rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow) ? (rawRow as Record<string, unknown>) : {};
          return (
            <RowCard
              key={key}
              index={i}
              count={entries.length}
              row={{ ...row }}
              rowFields={mode.rowFields}
              headerExtra={<span className="text-[9px] font-mono text-purple-300/80 bg-purple-950/30 border border-purple-500/20 px-1.5 py-0.5 rounded-md">{key}</span>}
              onChangeRow={(next) =>
                onChangeDoc({
                  ...base,
                  // 保持键名；若用户改了行内 id，校验面板会提示不一致
                  [key]: next as unknown as JsonValue
                } as unknown as JsonValue)
              }
              onDelete={() => {
                const next = { ...base };
                delete next[key];
                onChangeDoc(next as unknown as JsonValue);
              }}
              onDuplicate={() => {
                let k = `${key}_copy`;
                while (k in base) k += '_x';
                onChangeDoc(
                  Object.fromEntries(Object.entries(base).flatMap(([bk, bv]) => (bk === key ? [[bk, bv], [k, deepClone(bv)]] : [[bk, bv]]))) as unknown as JsonValue
                );
              }}
            />
          );
        })}
        {entries.length === 0 && <div className="text-center text-[11px] text-zinc-600 py-10">空表——输入键名后「+ 新增条目」开始</div>}
      </div>
    </>
  );
};

// === 单对象 ===

const SingleObjectEditor: React.FC<{ fields: Field[]; doc: JsonValue; onChangeDoc: (next: Record<string, unknown>) => void }> = ({
  fields,
  doc,
  onChangeDoc
}) => {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return <div className="text-[11px] text-red-400">文件根不是对象——请按问题提示修复，或改用原始 JSON 模式。</div>;
  }
  return <FieldGrid fields={fields} doc={doc as Record<string, unknown>} onChangeDoc={onChangeDoc} />;
};

// === 字符串清单 ===

const StringListEditor: React.FC<{ mode: Extract<SheetMode, { form: 'stringList' }>; doc: JsonValue; onChangeDoc: (next: JsonValue) => void }> = ({
  mode,
  doc,
  onChangeDoc
}) => {
  const catalogs: Catalogs = useCatalogs();
  const arr = Array.isArray(doc) ? (doc as string[]) : [];
  const cat = mode.catalog ? catalogs[mode.catalog] : undefined;
  const move = (i: number, d: -1 | 1) => {
    const next = [...arr];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChangeDoc(next as unknown as JsonValue);
  };
  return (
    <div className="flex flex-col gap-2 max-w-xl">
      <div className="text-[10px] text-zinc-500">顺序即发布序（loader 按此重排）· {arr.length} 项</div>
      <div className="flex flex-col gap-1">
        {arr.map((id, i) => {
          const opt = cat?.options.find((o) => o.id === id);
          return (
            <div key={`${id}-${i}`} className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-800 rounded-lg px-2 py-1.5">
              <span className="text-[9px] font-mono text-zinc-600 w-7">{i + 1}</span>
              <span className="text-[11px] font-mono text-zinc-200">{id}</span>
              {opt?.label && <span className="text-[10px] text-zinc-500">· {opt.label}</span>}
              {!opt && <Badge tone="warn">未知</Badge>}
              <span className="flex-1" />
              <Btn tone="ghost" disabled={i === 0} onClick={() => move(i, -1)}>↑</Btn>
              <Btn tone="ghost" disabled={i === arr.length - 1} onClick={() => move(i, 1)}>↓</Btn>
              <Btn tone="danger" onClick={() => onChangeDoc(arr.filter((_, j) => j !== i) as unknown as JsonValue)}>×</Btn>
            </div>
          );
        })}
      </div>
      {cat && (
        <div className="max-w-sm">
          <Combobox
            value=""
            options={cat.options.filter((o) => !arr.includes(o.id))}
            placeholder="+ 追加事件 id…"
            onChange={(v) => v && onChangeDoc([...arr, v] as unknown as JsonValue)}
          />
        </div>
      )}
    </div>
  );
};

// === 根级映射 ===

const MapRootEditor: React.FC<{ mode: Extract<SheetMode, { form: 'mapRoot' }>; doc: JsonValue; onChangeDoc: (next: JsonValue) => void }> = ({
  mode,
  doc,
  onChangeDoc
}) => {
  const field: Field = { kind: 'map', key: '', label: '', keyLabel: mode.keyLabel, keyCatalog: mode.keyCatalog, valueLabel: mode.valueLabel, value: mode.valueField };
  return <MapEditor field={field} value={doc} onChange={(v) => onChangeDoc((v ?? {}) as JsonValue)} />;
};
