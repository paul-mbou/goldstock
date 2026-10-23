import { useId } from 'react';

type LogoProps = {
  tone?: 'onDark' | 'onLight';
  className?: string;
  markOnly?: boolean;
};

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbdc8e" />
          <stop offset="0.55" stopColor="#f4b52c" />
          <stop offset="1" stopColor="#c57a0b" />
        </linearGradient>
      </defs>
      <path
        d="M25.6 9.2A11.5 11.5 0 1 0 27.5 16H17"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.5"
        strokeLinecap="square"
      />
      <path d="M17 16h3.6v6" fill="none" stroke={`url(#${gradientId})`} strokeWidth="4.5" strokeLinecap="square" />
    </svg>
  );
}

export function Logo({ tone = 'onDark', className = '', markOnly = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      {!markOnly && (
        <span className="text-xl font-extrabold tracking-tight">
          <span className="text-gold-400">GOLD</span>
          <span className={tone === 'onDark' ? 'text-white' : 'text-navy-900'}>STOCK</span>
        </span>
      )}
    </span>
  );
}
