import React from 'react';
import { Button } from './Button';
import { LinkButton } from './LinkButton';

interface EmptyStateProps {
  icon?: string;
  heading: string;
  subtext?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaHref?: string;
}

export function EmptyState({ icon = '📭', heading, subtext, ctaLabel, onCta, ctaHref }: EmptyStateProps) {
  const showCta = Boolean(ctaLabel && (onCta || ctaHref));

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
      <span className="text-5xl" aria-hidden="true">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-800">{heading}</h3>
      {subtext && <p className="text-sm text-gray-500 max-w-xs">{subtext}</p>}

      {showCta && (
        <div className="mt-2">
          {ctaHref ? (
            <LinkButton href={ctaHref} variant="primary" size="md">
              {ctaLabel}
            </LinkButton>
          ) : (
            <Button variant="primary" size="md" onClick={onCta}>
              {ctaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
