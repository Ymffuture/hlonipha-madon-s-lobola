export function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" className={`mx-auto h-6 w-56 text-gold ${className}`} aria-hidden="true">
      <path d="M0 12h80M140 12h80" stroke="currentColor" strokeWidth="1" />
      <path d="M110 2l10 10-10 10-10-10z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M110 7l5 5-5 5-5-5z" fill="currentColor" />
      <circle cx="88" cy="12" r="2" fill="currentColor" />
      <circle cx="132" cy="12" r="2" fill="currentColor" />
      <path d="M92 12c3-5 7-5 8 0M128 12c-3-5-7-5-8 0" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function Floral({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`text-gold ${className}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".8">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <path key={r} d="M60 60 C50 40 55 22 60 14 C65 22 70 40 60 60Z" transform={`rotate(${r} 60 60)`} />
        ))}
        <circle cx="60" cy="60" r="7" />
        <circle cx="60" cy="60" r="2.5" fill="currentColor" />
      </g>
    </svg>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-medium text-foreground sm:text-5xl">{title}</h2>
      <Ornament className="mt-4" />
    </div>
  );
}
