'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Toast { id: number; message: string; type: 'success' | 'danger' | 'warning'; }

const ToastContext = createContext<{
  toast: (msg: string, type?: 'success' | 'danger' | 'warning') => void;
}>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'danger' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3.5 rounded-full font-semibold text-sm text-white shadow-lg pointer-events-auto max-w-sm animate-[slideInRight_0.35s_ease,slideOutRight_0.35s_ease_2.3s_forwards]
              ${t.type === 'success' ? 'bg-[#10B981]' : t.type === 'danger' ? 'bg-[#EF4444]' : 'bg-[#F59E0B] text-[#1E1B4B]'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
