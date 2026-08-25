/** 图标预览与选择器（切图网格 + Lucide iconKey 网格 + 自定义路径） */
import React, { useMemo, useState } from 'react';
import { iconFor } from '../../../configs/mappings/iconMap';
import { LUCIDE_KEYS, SPRITE_PATHS, spriteUrl } from '../dataAccess';
import { inputCls, Modal } from './primitives';

export const IconPreview: React.FC<{ value: unknown; size?: number }> = ({ value, size = 22 }) => {
  if (typeof value !== 'string' || !value) {
    return <span className="inline-block border border-dashed border-zinc-700 rounded" style={{ width: size, height: size }} />;
  }
  if (value.endsWith('.png')) {
    const url = spriteUrl(value);
    return url ? (
      <img src={url} alt={value} width={size} height={size} className="object-contain shrink-0" />
    ) : (
      <span
        className="inline-flex items-center justify-center bg-red-950/40 border border-red-500/30 rounded text-red-400 text-[9px] font-black"
        style={{ width: size, height: size }}
        title={`切图不存在：${value}`}
      >
        !
      </span>
    );
  }
  const Icon = iconFor(value);
  return <Icon size={size} className="text-zinc-300 shrink-0" />;
};

export const IconPicker: React.FC<{ open: boolean; value: string; onClose: () => void; onSelect: (v: string) => void }> = ({
  open,
  value,
  onClose,
  onSelect
}) => {
  const [tab, setTab] = useState<'sprite' | 'lucide' | 'custom'>('sprite');
  const [q, setQ] = useState('');

  const filteredSprites = useMemo(() => {
    const all = SPRITE_PATHS;
    return (q ? all.filter((p) => p.toLowerCase().includes(q.toLowerCase())) : all).slice(0, 300);
  }, [q]);

  const filteredLucide = useMemo(() => (q ? LUCIDE_KEYS.filter((k) => k.includes(q.toLowerCase())) : LUCIDE_KEYS), [q]);

  return (
    <Modal open={open} onClose={onClose} title={`选择图标（当前：${value || '空'}）`} wide>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          {(
            [
              ['sprite', `切图 (${SPRITE_PATHS.length})`],
              ['lucide', `线性图标 (${LUCIDE_KEYS.length})`],
              ['custom', '自定义']
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${
                tab === t ? 'bg-purple-950/50 text-purple-300 border-purple-500/40' : 'text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
          {tab !== 'custom' && <input className={`${inputCls} ml-auto w-40`} placeholder="搜索…" value={q} onChange={(e) => setQ(e.target.value)} />}
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {tab === 'sprite' && (
            <div className="grid grid-cols-10 gap-1.5">
              {filteredSprites.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    onSelect(p);
                    onClose();
                  }}
                  title={p}
                  className={`aspect-square flex items-center justify-center rounded-lg border p-1 cursor-pointer hover:bg-purple-950/40 ${
                    value === p ? 'border-purple-500 bg-purple-950/30' : 'border-zinc-800 bg-zinc-950/60'
                  }`}
                >
                  <IconPreview value={p} size={26} />
                </button>
              ))}
              {filteredSprites.length === 0 && <div className="col-span-10 text-center text-[10px] text-zinc-600 py-6">无匹配切图</div>}
            </div>
          )}
          {tab === 'lucide' && (
            <div className="grid grid-cols-8 gap-1.5">
              {filteredLucide.map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    onSelect(k);
                    onClose();
                  }}
                  title={k}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 cursor-pointer hover:bg-purple-950/40 ${
                    value === k ? 'border-purple-500 bg-purple-950/30' : 'border-zinc-800 bg-zinc-950/60'
                  }`}
                >
                  <IconPreview value={k} size={20} />
                  <span className="text-[7px] text-zinc-500 font-mono truncate w-full text-center">{k}</span>
                </button>
              ))}
            </div>
          )}
          {tab === 'custom' && <CustomInput initial={value} onSubmit={(v) => { onSelect(v); onClose(); }} />}
        </div>
      </div>
    </Modal>
  );
};

const CustomInput: React.FC<{ initial: string; onSubmit: (v: string) => void }> = ({ initial, onSubmit }) => {
  const [v, setV] = useState(initial);
  return (
    <div className="flex flex-col gap-2">
      <input
        className={`${inputCls} font-mono`}
        value={v}
        autoFocus
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && v.trim() && onSubmit(v.trim())}
      />
      <p className="text-[9px] text-zinc-500 leading-relaxed">
        切图填相对 src/assets/sprites/ 的路径（如 items/resources/timber.png，构建期校验存在性）；或填已注册的 Lucide iconKey。未知值运行时会回退 HelpCircle。
      </p>
      <button
        onClick={() => v.trim() && onSubmit(v.trim())}
        className="self-start px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold rounded-lg cursor-pointer"
      >
        使用该值
      </button>
    </div>
  );
};
