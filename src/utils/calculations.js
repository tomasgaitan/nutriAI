export const ACTIVITY_LABELS = {
  sedentario:  'Sedentario (sin ejercicio)',
  ligero:      'Ligero (1-3 días/semana)',
  moderado:    'Moderado (3-5 días/semana)',
  activo:      'Activo (6-7 días/semana)',
  muy_activo:  'Muy activo (2x por día)',
}

const ACTIVITY_FACTORS = {
  sedentario: 1.2,
  ligero:     1.375,
  moderado:   1.55,
  activo:     1.725,
  muy_activo: 1.9,
}

export const GOAL_LABELS = {
  deficit:       'Bajar de peso (déficit)',
  volumen:       'Ganar músculo (volumen)',
  recomposicion: 'Recomposición corporal',
}

/** Mifflin-St Jeor */
export function calcTMB(sex, weight, height, age) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return sex === 'masculino' ? base + 5 : base - 161
}

export function calcTDEE(tmb, activity) {
  return tmb * (ACTIVITY_FACTORS[activity] ?? 1.375)
}

export function calcTargets(tdee, goal, weight) {
  let calories
  if      (goal === 'deficit')  calories = tdee - 400
  else if (goal === 'volumen')  calories = tdee + 400
  else                          calories = tdee

  // Protein: 1.8g/kg
  const protein_target = Math.round(weight * 1.8)
  // Fats: 25% of calories
  const fats_target    = Math.round((calories * 0.25) / 9)
  // Carbs: remainder
  const remainCals     = calories - protein_target * 4 - fats_target * 9
  const carbs_target   = Math.max(Math.round(remainCals / 4), 50)

  return {
    calories_target: Math.round(calories),
    protein_target,
    carbs_target,
    fats_target,
  }
}
