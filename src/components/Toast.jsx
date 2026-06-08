import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'success', duration = 4000) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-100'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-100'
                : 'bg-green-50 text-green-800 border border-green-100'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-current opacity-50 hover:opacity-100 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
