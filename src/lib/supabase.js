import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
)

export default supabase

// ── User Profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

export async function saveUserProfile(userId, fields) {
  const { data, error } = await supabase
    .from('user_profile')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error }
}

// ── Meal Logs ─────────────────────────────────────────────────────────────────

export async function saveMealLog(userId, meal) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id:     userId,
      date:        today,
      meal_type:   meal.meal_type   ?? 'snack',
      description: meal.description ?? '',
      calories:    Number(meal.calories)  || 0,
      protein:     Number(meal.protein)   || 0,
      carbs:       Number(meal.carbs)     || 0,
      fats:        Number(meal.fats)      || 0,
    })
    .select()
    .single()

  if (!error) await recalcDailySummary(userId, today)
  return { data, error }
}

export async function getTodayMeals(userId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true })
  return { data: data ?? [], error }
}

export async function deleteMealLog(id, userId) {
  const { error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (!error) {
    const today = new Date().toISOString().split('T')[0]
    await recalcDailySummary(userId, today)
  }
  return { error }
}

// ── Daily Summaries ───────────────────────────────────────────────────────────

async function recalcDailySummary(userId, date) {
  const { data: meals } = await supabase
    .from('meal_logs')
    .select('calories, protein, carbs, fats')
    .eq('user_id', userId)
    .eq('date', date)

  const totals = (meals ?? []).reduce(
    (acc, m) => ({
      total_calories: acc.total_calories + (m.calories || 0),
      total_protein:  acc.total_protein  + (m.protein  || 0),
      total_carbs:    acc.total_carbs    + (m.carbs    || 0),
      total_fats:     acc.total_fats     + (m.fats     || 0),
    }),
    { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 },
  )

  await supabase
    .from('daily_summaries')
    .upsert(
      { user_id: userId, date, ...totals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )
}

export async function getHistorySummaries(userId, days = 30) {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const fromStr = from.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', fromStr)
    .order('date', { ascending: true })
  return { data: data ?? [], error }
}
