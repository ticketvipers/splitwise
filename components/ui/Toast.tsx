'use client';
import React, { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type?: ToastType;
  message: string;
  onDismiss: () => void;
  duration?: number; // ms, 0 = persistent
}

const styles: Record<ToastType, { bg: string; icon: string; text: string }> = {
  success: { bg: 'bg-[var(--color-success-light)] border-[var(--color-success)]', icon: '✅', text: 'text-[var(--color-success)]' },
  error: { bg: 'bg-[var(--color-danger-light)] border-[var(--color-danger)]', icon: '❌', text: 'text-[var(--color-danger)]' },
  warning: { bg: 'bg-[var(--color-warning-light)] border-[var(--color-warning)]', icon: '⚠️', text: 'text-[var(--color-warning)]' },
  info: { bg: 'bg-[var(--color-info-light)] border-[var(--color-info)]', icon: 'ℹ️', text: 'text-[var(--color-info)]' },
};

export function Toast({ type = 'info', message, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const s = styles[type];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md max-w-sm w-full ${s.bg}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{s.icon}</span>
      <p className={`text-sm font-medium flex-1 ${s.text}`}>{message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * ToastContainer — render at root level, top-right.
 * Manage a list of toasts in parent state and pass here.
 */
interface ToastItem {
  id: string;
  type?: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} type={t.type} message={t.message} duration={t.duration} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
