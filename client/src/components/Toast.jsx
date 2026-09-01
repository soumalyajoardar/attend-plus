// eslint-disable-next-line react-refresh/only-export-components
import React, { useCallback, useRef, useState } from 'react';
import { IconCheckCircle, IconAlertCircle } from './Icons';

// Small, dependency-free toast system. Usage:
//   const { toasts, showToast } = useToast();
//   showToast('Saved!', 'success');
//   <ToastStack toasts={toasts} />
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timers = useRef(new Set());
  const showToast = useCallback((message, type = 'success', duration = 3200) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(t);
    }, duration);
    timers.current.add(t);
  }, []);
  // cleanup timers on unmount would be handled by caller, but also clear if needed
  React.useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
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
