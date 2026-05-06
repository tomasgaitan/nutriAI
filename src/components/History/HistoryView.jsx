import { useState, useEffect } from 'react'
import { getHistorySummaries } from '../../lib/supabase'

const PERIODS = [
  { label: '7 días',  days: 7  },
  { label: '30 días', days: 30 },
]

export default function HistoryView({ profile, userId }) {
  const [period, setPeriod] = useState(7)
  const [data,   setData]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getHistorySummaries(userId, period).then(({ data: rows }) => {
      setData(rows ?? [])
      setLoading(false)
    })
  }, [userId, period])

  const target = profile.calories_target

  const avg = data.length
    ? Math.round(data.reduce((s, d) => s + (d.total_calories || 0), 0) / data.length)
    : 0

  const compliance = data.length
    ? Math.round(
        (data.filter(d => {
          const pct = (d.total_calories || 0) / target
          return pct >= 0.85 && pct <= 1.15
        }).length / data.length) * 100
      )
    : 0

  const maxCal = Math.max(...data.map(d => d.total_calories || 0), target, 1)

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-syne font-bold text-xl text-white">Historial</h2>
            <p className="text-sm text-muted font-dm">Seguimiento de tus comidas</p>
          </div>
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-4 py-1.5 rounded-lg text-sm font-dm transition-all ${
                  period === p.days
                    ? 'bg-cal-green/20 text-cal-green font-medium'
                    : 'text-muted hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Promedio diario', value: `${avg} kcal`,      sub: `meta: ${target} kcal`,      color: 'text-cal-green'   },
            { label: 'Días registrados', value: data.length,        sub: `de ${period} días`,         color: 'text-prot-blue'   },
            { label: 'Cumplimiento',     value: `${compliance}%`,   sub: '±15% del objetivo',         color: compliance >= 70 ? 'text-cal-green' : 'text-carb-orange' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-2xl p-4 text-center">
              <p className={`font-syne font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted font-dm mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted/60 font-dm">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h3 className="font-syne font-semibold text-white text-sm mb-4">Calorías por día</h3>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-cal-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-muted font-dm text-sm">
              <p className="text-3xl mb-2">📊</p>
              Sin datos para este período
            </div>
          ) : (
            <BarChart data={data} target={target} maxCal={maxCal} />
          )}
        </div>

        {/* Macro averages */}
        {data.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="font-syne font-semibold text-white text-sm mb-4">Promedios de macros</h3>
            <MacroAverages data={data} profile={profile} />
          </div>
        )}
      </div>
    </div>
  )
}

function BarChart({ data, target, maxCal }) {
  const H     = 160
  const BAR_W = Math.max(Math.min(Math.floor(680 / data.length) - 4, 40), 8)

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(data.length * (BAR_W + 4), 400)}
        height={H + 40}
        className="block"
      >
        {/* Target line */}
        <line
          x1={0} y1={H - (target / maxCal) * H}
          x2={data.length * (BAR_W + 4)} y2={H - (target / maxCal) * H}
          stroke="#22c55e" strokeWidth={1} strokeDasharray="4,3" opacity={0.5}
        />
        <text
          x={4} y={H - (target / maxCal) * H - 4}
          fill="#22c55e" fontSize={9} opacity={0.7}
          fontFamily="DM Sans, sans-serif"
        >
          meta {target}
        </text>

        {data.map((d, i) => {
          const cal      = d.total_calories || 0
          const barH     = Math.max((cal / maxCal) * H, 2)
          const x        = i * (BAR_W + 4)
          const y        = H - barH
          const over     = cal > target * 1.15
          const under    = cal < target * 0.5
          const color    = over ? '#f97316' : under ? '#6b7280' : '#22c55e'
          const dateStr  = formatDay(d.date)

          return (
            <g key={d.date}>
              <rect
                x={x} y={y}
                width={BAR_W} height={barH}
                fill={color} rx={4} opacity={0.85}
              />
              {/* Calories label on hover via title */}
              <title>{dateStr}: {Math.round(cal)} kcal</title>
              {/* Date label */}
              <text
                x={x + BAR_W / 2} y={H + 14}
                textAnchor="middle"
                fill="#6b7280" fontSize={8}
                fontFamily="DM Sans, sans-serif"
              >
                {dateStr}
              </text>
              {/* Value on bar if wide enough */}
              {BAR_W >= 22 && barH > 18 && (
                <text
                  x={x + BAR_W / 2} y={y + 12}
                  textAnchor="middle"
                  fill="white" fontSize={8}
                  fontFamily="DM Sans, sans-serif"
                  opacity={0.8}
                >
                  {Math.round(cal)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function MacroAverages({ data, profile }) {
  const avg = (key) =>
    data.length ? Math.round(data.reduce((s, d) => s + (d[key] || 0), 0) / data.length) : 0

  const macros = [
    { key: 'total_protein', label: 'Proteínas',     color: '#3b82f6', target: profile.protein_target, unit: 'g' },
    { key: 'total_carbs',   label: 'Carbohidratos', color: '#f97316', target: profile.carbs_target,   unit: 'g' },
    { key: 'total_fats',    label: 'Grasas',        color: '#ec4899', target: profile.fats_target,    unit: 'g' },
  ]

  return (
    <div className="space-y-4">
      {macros.map(m => {
        const value = avg(m.key)
        const pct   = m.target > 0 ? Math.min((value / m.target) * 100, 100) : 0
        const over  = value > m.target

        return (
          <div key={m.key}>
            <div className="flex justify-between text-xs font-dm mb-1">
              <span style={{ color: m.color }}>{m.label}</span>
              <span className="text-muted">
                prom. <span className="text-white">{value}{m.unit}</span> / {m.target}{m.unit}
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full macro-bar-fill"
                style={{ width: `${pct}%`, backgroundColor: over ? '#f97316' : m.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
