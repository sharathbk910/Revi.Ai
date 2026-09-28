import React from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { Check, AlertCircle, Info, Terminal, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = usePlanner();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map(toast => {
        const isError = toast.type === 'WARNING';
        const isSuccess = toast.type === 'SUCCESS';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[var(--card)] border border-[var(--border)] p-3.5 flex items-start justify-between gap-3 text-xs font-mono shadow-sm transition-all duration-150 animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 ${isSuccess ? 'text-[var(--accent)]' : isError ? 'text-[#FF3D00]' : 'text-[var(--foreground)]'}`}>
                {isSuccess ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isError ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : toast.type === 'SYSTEM' ? (
                  <Terminal className="w-3.5 h-3.5" />
                ) : (
                  <Info className="w-3.5 h-3.5" />
                )}
              </span>
              <div>
                <div className="font-bold text-[var(--foreground)] uppercase tracking-wider text-[11px]">
                  {toast.title}
                </div>
                <div className="text-[var(--muted-foreground)] mt-0.5 text-[11px] leading-relaxed">
                  {toast.message}
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
