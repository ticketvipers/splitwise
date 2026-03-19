'use client';

import Link from 'next/link';
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  prefetch?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-brand)] text-white font-semibold hover:bg-[var(--color-brand-dark)] focus-visible:ring-[var(--color-brand)]',
  secondary:
    'bg-white text-gray-700 font-medium border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
  destructive:
    'bg-[var(--color-danger)] text-white font-semibold hover:opacity-90 focus-visible:ring-[var(--color-danger)]',
  ghost:
    'bg-transparent text-gray-600 font-medium hover:bg-gray-100 focus-visible:ring-gray-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[32px]',
  md: 'px-4 py-2 text-sm rounded-lg min-h-[40px]',
  lg: 'px-5 py-2.5 text-base rounded-lg min-h-[44px]',
};

export function LinkButton({
  href,
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  prefetch,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
