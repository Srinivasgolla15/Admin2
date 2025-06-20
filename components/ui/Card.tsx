import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleClassName?: string;
  footer?: React.ReactNode;
  contentClassName?: string;
  compact?: boolean; // Optional: tighter padding if needed
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  titleClassName = '',
  footer,
  contentClassName = '',
  compact = false,
}) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors',
        className
      )}
    >
      {title && (
        <div
          className={clsx(
            'px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
            titleClassName
          )}
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h3>
        </div>
      )}

      <div
        className={clsx(
          compact ? 'p-3 sm:p-4' : 'p-5 sm:p-6',
          contentClassName
        )}
      >
        {children}
      </div>

      {footer && (
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
