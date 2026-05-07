import { useState, useEffect } from 'react'
import { getUsageLogs } from '../../lib/supabase'

const PERIODS = [
  { label: '7 días',  days: 7  },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

const TYPE_LABEL = { meal: 'Comida', chat: 'Consulta', image: 'Foto' }
const TYPE_COLOR = { meal: 'text-cal-green', chat: 'text-prot-blue', image: 'text-carb-orange' }
const TYPE_ICON  = { meal: '🥗', chat: '💬', image: '📷' }

export default function AdminView({ userId }) {
  const [period,  setPeriod]  = useState(30)
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getUsageLogs(userId, period).then(({ data }) => {
      setLogs(data)
      setLoading(false)
    })
  }, [userId, period])

  const total = logs.reduce((acc, l) => ({
    cost:          acc.cost          + (l.cost_usd              || 0),
    input:         acc.input         + (l.input_tokens          || 0),
    output:        acc.output        + (l.output_tokens         || 0),
    cache_create:  acc.cache_create  + (l.cache_creation_tokens || 0),
    cache_read:    acc.cache_read    + (l.cache_read_tokens     || 0),
    images:        acc.images        + (l.message_type === 'image' ? 1 : 0),
    meals:         acc.meals         + (l.message_type === 'meal'  ? 1 : 0),
    chats:         acc.chats         + (l.message_type === 'chat'  ? 1 : 0),
  }), { cost: 0, input: 0, output: 0, cache_create: 0, cache_read: 0, images: 0, meals: 0, chats: 0 })

  const avgCost = logs.length ? total.cost / logs.length : 0

  const byType = ['meal', 'chat', 'image'].map(type => {
    const typeLogs = logs.filter(l => l.message_type === type)
    const typeCost = typeLogs.reduce((s, l) => s + (l.cost_usd || 0), 0)
    return { type, count: typeLogs.length, cost: typeCost }
  }).filter(t => t.count > 0)

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-syne font-bold text-xl text-white">Admin — Uso de API</h2>
            <p className="text-sm text-muted font-dm">Tokens y costos de Claude</p>
          </div>
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-dm transition-all ${
                  period === p.days ? 'bg-cal-green/20 text-cal-green font-medium' : 'text-muted hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-cal-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Gasto total" value={`$${total.cost.toFixed(4)}`} sub="USD" color="text-cal-green" />
              <StatCard label="Mensajes"    value={logs.length}                  sub={`${period} días`}          color="text-white" />
              <StatCard label="Costo prom." value={`$${avgCost.toFixed(4)}`}    sub="por mensaje"               color="text-prot-blue" />
              <StatCard label="Fotos"       value={total.images}                 sub="analizadas"                color="text-carb-orange" />
            </div>

            {/* Token breakdown */}
            <div className="bg-surface border border-border rounded-2xl p-5 mb-5">
              <h3 className="font-syne font-semibold text-white text-sm mb-4">Tokens</h3>
              <div className="space-y-3">
                <TokenRow label="Input"         value={total.input}        cost={total.input * 3 / 1_000_000}         color="#22c55e" />
                <TokenRow label="Output"        value={total.output}       cost={total.output * 15 / 1_000_000}       color="#3b82f6" />
                <TokenRow label="Cache write"   value={total.cache_create} cost={total.cache_create * 3.75 / 1_000_000} color="#f97316" />
                <TokenRow label="Cache read"    value={total.cache_read}   cost={total.cache_read * 0.30 / 1_000_000}  color="#a855f7" />
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs font-dm">
                <span className="text-muted">Total tokens</span>
                <span className="text-white font-medium">{(total.input + total.output).toLocaleString()}</span>
              </div>
            </div>

            {/* Cost by type */}
            {byType.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-5 mb-5">
                <h3 className="font-syne font-semibold text-white text-sm mb-4">Costo por tipo</h3>
                <div className="space-y-2">
                  {byType.map(t => (
                    <div key={t.type} className="flex items-center gap-3">
                      <span className="text-lg w-6">{TYPE_ICON[t.type]}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-dm mb-1">
                          <span className={TYPE_COLOR[t.type]}>{TYPE_LABEL[t.type]} ({t.count})</span>
                          <span className="text-white">${t.cost.toFixed(4)}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${total.cost > 0 ? (t.cost / total.cost) * 100 : 0}%`,
                              backgroundColor: t.type === 'meal' ? '#22c55e' : t.type === 'chat' ? '#3b82f6' : '#f97316',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent logs */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-syne font-semibold text-white text-sm mb-4">Últimas llamadas</h3>
              {logs.length === 0 ? (
                <p className="text-muted text-sm font-dm text-center py-6">Sin datos aún</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 30).map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-base">{TYPE_ICON[l.message_type] ?? '❓'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-dm font-medium ${TYPE_COLOR[l.message_type] ?? 'text-muted'}`}>
                            {TYPE_LABEL[l.message_type] ?? l.message_type}
                          </span>
                          <span className="text-[10px] text-muted font-dm">{formatDate(l.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-muted font-dm">
                          in: {l.input_tokens} · out: {l.output_tokens}
                          {l.cache_read_tokens > 0 && ` · cache: ${l.cache_read_tokens}`}
                        </p>
                      </div>
                      <span className="text-xs font-dm text-white shrink-0">
                        ${(l.cost_usd || 0).toFixed(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 text-center">
      <p className={`font-syne font-bold text-2xl ${color}`}>{value}</p>
      <p className="text-[11px] text-muted font-dm mt-0.5">{label}</p>
      <p className="text-[10px] text-muted/60 font-dm">{sub}</p>
    </div>
  )
}

function TokenRow({ label, value, cost, color }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between text-xs font-dm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-muted">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-white">{value.toLocaleString()} tok</span>
        <span className="text-muted w-20 text-right">${cost.toFixed(5)}</span>
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
