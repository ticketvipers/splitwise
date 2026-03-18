import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  const base =
    'bg-white rounded-xl border border-gray-200 shadow-sm';
  const interactive = onClick
    ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-150'
    : '';

  return (
    <div
      className={[base, paddingClasses[padding], interactive, className].join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
}
