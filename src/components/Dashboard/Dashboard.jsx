import { useState, useEffect, useCallback } from 'react'
import { getTodayMeals } from '../../lib/supabase'
import CalorieRing       from './CalorieRing'
import MacroBars         from './MacroBars'
import MealTable         from './MealTable'

const TODAY_FMT = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long'
})

export default function Dashboard({ profile, userId, refreshKey }) {
  const [meals,   setMeals]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await getTodayMeals(userId)
    setMeals(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load, refreshKey])

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein:  acc.protein  + (m.protein  || 0),
      carbs:    acc.carbs    + (m.carbs    || 0),
      fats:     acc.fats     + (m.fats     || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  const today = TODAY_FMT.format(new Date())

  return (
    <div className="flex flex-col overflow-hidden bg-surface w-full h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h2 className="font-syne font-bold text-white">Dashboard</h2>
        <p className="text-xs text-muted font-dm capitalize">{today}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Calorie ring + Macro bars */}
        <div className="flex items-center gap-5">
          <CalorieRing
            consumed={totals.calories}
            target={profile.calories_target}
          />
          <div className="flex-1">
            <MacroBars totals={totals} profile={profile} />
          </div>
        </div>

        {/* Macro mini-stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Proteínas', value: Math.round(totals.protein),  target: profile.protein_target,  color: 'text-prot-blue',   unit: 'g' },
            { label: 'Carbos',    value: Math.round(totals.carbs),    target: profile.carbs_target,    color: 'text-carb-orange', unit: 'g' },
            { label: 'Grasas',    value: Math.round(totals.fats),     target: profile.fats_target,     color: 'text-fat-pink',    unit: 'g' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl p-3 border border-border text-center">
              <p className={`font-syne font-bold text-lg ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted font-dm">/{s.target}{s.unit}</p>
              <p className="text-[10px] text-muted font-dm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Profile targets reminder */}
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="text-xl">🎯</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted font-dm">
              Objetivo: <span className="text-white capitalize">{profile.goal?.replace('_', ' ')}</span>
            </p>
            <p className="text-xs text-muted font-dm">
              Meta: <span className="text-cal-green">{profile.calories_target} kcal</span>
              {' · '}TMB <span className="text-white">{Math.round(profile.tmb)}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-white font-dm font-medium">{profile.name}</p>
            <p className="text-[10px] text-muted font-dm">{profile.weight}kg · {profile.height}cm</p>
          </div>
        </div>

        {/* Today's meals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-syne font-semibold text-white text-sm">
              Comidas de hoy
            </h3>
            <span className="text-xs text-muted font-dm">{meals.length} registro{meals.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-cal-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MealTable
              meals={meals}
              userId={userId}
              onDelete={load}
            />
          )}
        </div>
      </div>
    </div>
  )
}
