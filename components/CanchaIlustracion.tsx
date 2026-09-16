// Ilustración simple de una cancha de fút5 en la paleta Organic — no hay
// fotografía real disponible para varios estados vacíos, esto le da
// identidad visual sin depender de un asset externo. Sin `rx`: el
// contenedor que la envuelve es el que recorta las esquinas.
export function CanchaIlustracion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} role="img" aria-label="Ilustración de una cancha de fútbol 5">
      <rect x="0" y="0" width="320" height="180" className="fill-sage" />
      <g stroke="var(--background)" strokeOpacity="0.5" strokeWidth="2.5" fill="none">
        <line x1="160" y1="14" x2="160" y2="166" />
        <circle cx="160" cy="90" r="26" />
        <circle cx="160" cy="90" r="2.5" fill="var(--background)" fillOpacity="0.5" stroke="none" />
        <rect x="14" y="52" width="34" height="76" rx="2" />
        <rect x="272" y="52" width="34" height="76" rx="2" />
        <rect x="4" y="70" width="14" height="40" rx="2" />
        <rect x="302" y="70" width="14" height="40" rx="2" />
      </g>
      <circle cx="110" cy="90" r="7" className="fill-brand" />
      <circle cx="215" cy="60" r="7" className="fill-background" />
    </svg>
  );
}
