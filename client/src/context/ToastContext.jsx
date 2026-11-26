import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const tone = {
  success: 'border-emerald-500/40 text-emerald-300',
  error: 'border-rose-500/40 text-rose-300',
  info: 'border-sky-450/40 text-sky-300',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3800);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex animate-pop items-start gap-3 rounded-xl border bg-ink-800/95 p-3.5 shadow-2xl backdrop-blur ${tone[t.type]}`}>
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm text-slate-100">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
