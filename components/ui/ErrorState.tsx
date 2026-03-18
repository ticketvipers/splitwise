import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  inline?: boolean;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  inline = false,
}: ErrorStateProps) {
  if (inline) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-sm text-[var(--color-danger)]"
        role="alert"
      >
        <span aria-hidden="true">⚠️</span>
        <span className="flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="underline text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger)] rounded"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3" role="alert">
      <span className="text-4xl" aria-hidden="true">⚠️</span>
      <h3 className="text-lg font-semibold text-gray-800">Something went wrong</h3>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry} className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
}
