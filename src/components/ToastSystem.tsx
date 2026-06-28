import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  text: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  const handleConfirmAction = () => {
    if (confirm) {
      confirm.onConfirm();
      setConfirm(null);
    }
  };

  const handleCancelAction = () => {
    if (confirm) {
      if (confirm.onCancel) confirm.onCancel();
      setConfirm(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toasts Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs pointer-events-none">
        {toasts.map(toast => {
          let bgColor = 'bg-zinc-900 border-zinc-700 text-zinc-100';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200';
            Icon = CheckCircle;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-950/90 border-rose-500/50 text-rose-200';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-950/90 border-amber-500/50 text-amber-200';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center gap-3 p-3 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 transform translate-y-0 animate-fade-in pointer-events-auto ${bgColor}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
              <span className="text-[11px] font-bold leading-tight">{toast.text}</span>
            </div>
          );
        })}
      </div>

      {/* Custom Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl animate-slide-up flex flex-col gap-4 text-center">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{confirm.title}</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{confirm.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelAction}
                className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-xl active:scale-95 transition-all"
              >
                {confirm.cancelText || '取消'}
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-purple-950/30"
              >
                {confirm.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
