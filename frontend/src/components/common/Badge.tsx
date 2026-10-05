import type { ReactNode } from 'react';

type Variant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const variantClasses: Record<Variant, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-sky-100 text-sky-800',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
