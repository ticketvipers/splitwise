import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full px-3 py-2 text-sm rounded-lg border bg-white text-gray-800 placeholder-gray-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent',
          error
            ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
            : 'border-gray-300',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
}
