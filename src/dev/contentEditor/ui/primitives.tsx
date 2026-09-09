/** 编辑器 UI 基础件（dev-only） */
import React from 'react';

export const Btn: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  tone?: 'default' | 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  title?: string;
  className?: string;
}> = ({ onClick, children, tone = 'default', disabled, title, className = '' }) => {
  const tones: Record<string, string> = {
    default: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    primary: 'bg-purple-700 hover:bg-purple-600 text-white border-purple-500/40',
    danger: 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-500/30',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-transparent'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{ tone?: 'error' | 'warn' | 'dirty' | 'ok'; children: React.ReactNode }> = ({ tone = 'ok', children }) => {
  const tones: Record<string, string> = {
    error: 'bg-red-950/60 text-red-300 border-red-500/30',
    warn: 'bg-amber-950/50 text-amber-300 border-amber-500/30',
    dirty: 'bg-purple-950/50 text-purple-300 border-purple-500/30',
    ok: 'bg-zinc-900 text-zinc-500 border-zinc-800'
  };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-black leading-none ${tones[tone]}`}>{children}</span>;
};

export const FieldShell: React.FC<{ label: string; help?: string; required?: boolean; children: React.ReactNode; wide?: boolean; loc?: string }> = ({
  label,
  help,
  required,
  children,
  wide,
  loc
}) => (
  <div id={loc ? `field-${loc.replace(/[^\w-]/g, '_')}` : undefined} className={`flex flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
    <label className="text-[10px] font-black text-zinc-400 flex items-center gap-1">
      {label}
      {required && <span className="text-rose-400">*</span>}
      {help && <span className="text-[9px] font-normal text-zinc-600 normal-case">· {help}</span>}
    </label>
    {children}
  </div>
);

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }> = ({
  open,
  onClose,
  title,
  children,
  wide
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center p-8 overflow-y-auto" onClick={onClose}>
      <div
        className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} mt-10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800">
          <h3 className="text-xs font-black text-zinc-200">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-sm cursor-pointer">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const inputCls =
  'bg-zinc-950 border border-zinc-800 text-xs px-2 py-1.5 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors w-full';
