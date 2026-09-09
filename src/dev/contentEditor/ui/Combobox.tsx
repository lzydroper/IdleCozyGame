/** 可搜索下拉（引用/枚举选择）；allowFree 时允许保留自由输入 */
import React, { useMemo, useRef, useState } from 'react';
import type { CatalogOption } from '../types';
import { inputCls } from './primitives';

export const Combobox: React.FC<{
  value: unknown;
  options: CatalogOption[];
  onChange: (v: string) => void;
  allowFree?: boolean;
  placeholder?: string;
  className?: string;
}> = ({ value, options, onChange, allowFree, placeholder, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null = 展示 value 原文
  const boxRef = useRef<HTMLDivElement>(null);

  const text = query ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = q ? options.filter((o) => o.id.toLowerCase().includes(q) || (o.label ?? '').toLowerCase().includes(q)) : options;
    return list.slice(0, 200);
  }, [options, text]);

  return (
    <div ref={boxRef} className="relative">
      <input
        className={`${inputCls} font-mono ${className}`}
        value={text}
        placeholder={placeholder ?? '输入过滤…'}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => {
          // 失焦：允许自由文本或回退原值
          if (query !== null && (allowFree || options.some((o) => o.id === query))) onChange(query);
          setQuery(null);
          window.setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const first = filtered[0];
            if (first && query !== null) {
              onChange(query === '' || first.id.toLowerCase().includes(query.toLowerCase()) ? first.id : query);
              setQuery(null);
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          } else if (e.key === 'Escape') {
            setQuery(null);
            setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.id);
                setQuery(null);
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1.5 text-[11px] cursor-pointer hover:bg-purple-950/40 ${
                String(value) === o.id ? 'text-purple-300 bg-purple-950/20' : 'text-zinc-300'
              }`}
            >
              <span className="font-mono">{o.id}</span>
              {o.label && <span className="text-zinc-500 ml-1.5">· {o.label}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
