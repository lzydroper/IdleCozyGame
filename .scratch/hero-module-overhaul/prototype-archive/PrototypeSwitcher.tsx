// PROTOTYPE 浮动切换底栏（非生产代码）：固定底部中央，左右箭头切换变体并写入 ?variant= 搜索参数。
// 键盘 ← → 也可切换（焦点在 input/textarea/contenteditable 时不拦截）。生产构建不渲染。
import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react';

export interface PrototypeSwitcherProps {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
}

const PrototypeSwitcher: React.FC<PrototypeSwitcherProps> = ({ variants, current, onChange }) => {
  const idx = Math.max(0, variants.findIndex(v => v.key === current));

  const cycle = (dir: 1 | -1) => {
    const next = (idx + dir + variants.length) % variants.length;
    onChange(variants[next].key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const tag = el ? el.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, variants]);

  if (import.meta.env.MODE !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 px-3 py-2 rounded-full bg-fuchsia-950/90 border border-fuchsia-500/60 shadow-2xl shadow-fuchsia-950/50 backdrop-blur-md select-none">
      <FlaskConical className="w-3.5 h-3.5 text-fuchsia-300" />
      <button
        onClick={() => cycle(-1)}
        className="w-7 h-7 rounded-full bg-fuchsia-900/80 border border-fuchsia-500/50 flex items-center justify-center text-fuchsia-200 hover:bg-fuchsia-800 cursor-pointer active:scale-95 transition-all"
        title="上一个变体 (←)"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-[10px] font-black text-fuchsia-100 min-w-[110px] text-center">
        {variants[idx]?.key} — {variants[idx]?.name}
      </span>
      <button
        onClick={() => cycle(1)}
        className="w-7 h-7 rounded-full bg-fuchsia-900/80 border border-fuchsia-500/50 flex items-center justify-center text-fuchsia-200 hover:bg-fuchsia-800 cursor-pointer active:scale-95 transition-all"
        title="下一个变体 (→)"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="text-[8px] text-fuchsia-300/70 font-bold ml-1">PROTOTYPE</span>
    </div>
  );
};

export default PrototypeSwitcher;
