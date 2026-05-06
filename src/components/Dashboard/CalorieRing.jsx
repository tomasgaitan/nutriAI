export default function CalorieRing({ consumed, target }) {
  const R           = 72
  const STROKE      = 10
  const SIZE        = (R + STROKE) * 2
  const circumf     = 2 * Math.PI * R
  const pct         = target > 0 ? Math.min(consumed / target, 1) : 0
  const dashOffset  = circumf * (1 - pct)
  const over        = consumed > target
  const color       = over ? '#f97316' : '#22c55e'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg
          width={SIZE} height={SIZE}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="#252836"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={circumf}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.25,0.46,0.45,0.94), stroke 0.3s' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center pointer-events-none">
          <span className="font-syne font-bold text-white" style={{ fontSize: 26 }}>
            {Math.round(consumed)}
          </span>
          <span className="text-[11px] text-muted font-dm">de {Math.round(target)}</span>
          <span className="text-[10px] text-muted font-dm">kcal</span>
        </div>
      </div>

      {/* Remaining / over */}
      {over ? (
        <p className="text-xs text-carb-orange font-dm">
          +{Math.round(consumed - target)} kcal por encima
        </p>
      ) : (
        <p className="text-xs text-muted font-dm">
          <span className="text-cal-green">{Math.round(target - consumed)}</span> kcal restantes
        </p>
      )}
    </div>
  )
}
