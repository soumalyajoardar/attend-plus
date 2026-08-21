import React, { useCallback, useRef, useState } from 'react';
import { IconCheckCircle, IconAlertCircle } from './Icons';

// Small, dependency-free toast system. Usage:
//   const { toasts, showToast } = useToast();
//   showToast('Saved!', 'success');
//   <ToastStack toasts={toasts} />
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success', duration = 3200) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, showToast };
}

export function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="ap-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`ap-toast ${t.type}`}>
          {t.type === 'error' ? <IconAlertCircle size={18} /> : <IconCheckCircle size={18} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
