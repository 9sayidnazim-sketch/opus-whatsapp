
/**
 * FulooziBrand Component
 * Renders the official Fuloozi vector brandmark & wordmark according to the design system.
 * 
 * Mark geometry:
 * - Top pill: Wide horizontal capsule bar
 * - Middle pill: Shorter horizontal capsule bar
 * - Bottom dot: Signature vibrant lime-green circular period
 */
export function FulooziMark({ size = 32, variant = 'squircle', className = '' }) {
  const isSquircle = variant === 'squircle';
  const isLimeBg = variant === 'lime';
  const isLight = variant === 'light';

  const barColor = isLimeBg || isLight ? '#181A1D' : '#FFFFFF';
  const dotColor = isLimeBg ? '#181A1D' : '#B5F13E';
  const bgColor = isSquircle ? '#181A1D' : isLimeBg ? '#B5F13E' : 'transparent';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {isSquircle && (
          <rect
            width="36"
            height="36"
            rx="10"
            fill={bgColor}
            className="transition-colors duration-200"
          />
        )}
        {/* Top horizontal pill bar */}
        <rect
          x={isSquircle ? 7 : 4}
          y={isSquircle ? 8 : 5}
          width={isSquircle ? 22 : 28}
          height={isSquircle ? 5.5 : 6.5}
          rx={isSquircle ? 2.75 : 3.25}
          fill={barColor}
        />
        {/* Middle horizontal pill bar */}
        <rect
          x={isSquircle ? 7 : 4}
          y={isSquircle ? 16 : 14.5}
          width={isSquircle ? 15 : 19}
          height={isSquircle ? 5.5 : 6.5}
          rx={isSquircle ? 2.75 : 3.25}
          fill={barColor}
        />
        {/* Signature vibrant lime bottom dot */}
        <circle
          cx={isSquircle ? 9.75 : 7.25}
          cy={isSquircle ? 26.75 : 27.25}
          r={isSquircle ? 2.75 : 3.25}
          fill={dotColor}
        />
      </svg>
    </div>
  );
}

export default function FulooziBrand({
  size = 36,
  showWordmark = true,
  variant = 'squircle',
  className = '',
  wordmarkClassName = '',
}) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <FulooziMark size={size} variant={variant} />
      {showWordmark && (
        <span
          className={`font-semibold tracking-[-0.03em] lowercase text-foreground leading-none ${
            size >= 40 ? 'text-2xl' : size >= 32 ? 'text-xl' : 'text-lg'
          } ${wordmarkClassName}`}
          style={{ fontFamily: 'var(--font-brand, "Plus Jakarta Sans", "Inter", sans-serif)' }}
        >
          fuloozi
        </span>
      )}
    </div>
  );
}
