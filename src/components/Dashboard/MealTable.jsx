import { deleteMealLog } from '../../lib/supabase'

const MEAL_ICONS = {
  desayuno: '🌅',
  almuerzo: '☀️',
  merienda: '🌤️',
  cena:     '🌙',
  snack:    '🍎',
  comida:   '🍽️',
}

export default function MealTable({ meals, userId, onDelete }) {
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminás esta comida?')) return
    await deleteMealLog(id, userId)
    onDelete?.()
  }

  if (!meals?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted">
        <span className="text-4xl mb-2">🍽️</span>
        <p className="text-sm font-dm">Sin comidas registradas hoy</p>
        <p className="text-xs mt-1 font-dm">Subí una foto en el chat</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {meals.map(m => (
        <div
          key={m.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border hover:border-muted/50 transition-colors group"
        >
          <span className="text-lg shrink-0">
            {MEAL_ICONS[m.meal_type] ?? MEAL_ICONS.comida}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-dm truncate capitalize">{m.description}</p>
            <p className="text-[11px] text-muted font-dm">
              {m.meal_type} · {formatTime(m.created_at)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-cal-green font-syne">{Math.round(m.calories)}</p>
            <p className="text-[10px] text-muted font-dm">kcal</p>
          </div>
          <div className="hidden group-hover:flex gap-1 text-[10px] text-muted font-dm shrink-0">
            <span className="text-prot-blue">{Math.round(m.protein)}g P</span>
            <span className="text-carb-orange">{Math.round(m.carbs)}g C</span>
            <span className="text-fat-pink">{Math.round(m.fats)}g G</span>
          </div>
          <button
            onClick={() => handleDelete(m.id)}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all text-xs px-1"
            title="Eliminar"
          >✕</button>
        </div>
      ))}
    </div>
  )
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
