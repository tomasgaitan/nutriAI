import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
)

export default supabase

// Devuelve la fecha local en formato YYYY-MM-DD (evita desfase UTC)
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
  const today = localToday()
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
  const today = localToday()
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
    const today = localToday()
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

// ── Usage Logs ────────────────────────────────────────────────────────────────

export async function saveUsageLog(userId, { message_type, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, cost_usd }) {
  await supabase.from('usage_logs').insert({
    user_id: userId,
    message_type,
    input_tokens:            input_tokens            ?? 0,
    output_tokens:           output_tokens           ?? 0,
    cache_creation_tokens:   cache_creation_tokens   ?? 0,
    cache_read_tokens:       cache_read_tokens        ?? 0,
    cost_usd:                cost_usd                ?? 0,
  })
}

export async function getUsageLogs(userId, days = 30) {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
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
