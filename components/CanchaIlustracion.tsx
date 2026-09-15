// Ilustración simple de una cancha de fút5 en la paleta de la app — no hay
// fotografía real disponible para el hero de la landing, esto le da
// identidad visual sin depender de un asset externo.
export function CanchaIlustracion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} role="img" aria-label="Ilustración de una cancha de fútbol 5">
      <rect x="4" y="4" width="312" height="172" rx="16" className="fill-primary" />
      <rect x="4" y="4" width="312" height="172" rx="16" className="fill-primary-foreground/0" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
      <g stroke="white" strokeOpacity="0.55" strokeWidth="2.5" fill="none">
        <line x1="160" y1="14" x2="160" y2="166" />
        <circle cx="160" cy="90" r="26" />
        <circle cx="160" cy="90" r="2.5" fill="white" stroke="none" />
        <rect x="14" y="52" width="34" height="76" rx="2" />
        <rect x="272" y="52" width="34" height="76" rx="2" />
        <rect x="4" y="70" width="14" height="40" rx="2" />
        <rect x="302" y="70" width="14" height="40" rx="2" />
      </g>
      <circle cx="110" cy="90" r="7" className="fill-primary-foreground" />
      <circle cx="215" cy="60" r="7" className="fill-primary-foreground" fillOpacity="0.85" />
    </svg>
  );
}
