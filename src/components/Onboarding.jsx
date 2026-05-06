import { useState } from 'react'
import { saveUserProfile }                          from '../lib/supabase'
import { calcTMB, calcTDEE, calcTargets, ACTIVITY_LABELS, GOAL_LABELS } from '../utils/calculations'

const STEPS = ['Bienvenida', 'Datos personales', 'Tu cuerpo', 'Actividad', 'Objetivo']

const INPUT  = 'w-full bg-card border border-border rounded-xl px-4 py-3 text-white placeholder-muted focus:outline-none focus:border-cal-green transition-colors font-dm'
const SELECT = `${INPUT} cursor-pointer`
const LABEL  = 'block text-sm font-medium text-muted mb-2 font-dm'

export default function Onboarding({ userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:           '',
    age:            '',
    sex:            'masculino',
    weight:         '',
    height:         '',
    activity_level: 'moderado',
    training:       '',
    goal:           'recomposicion',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const pct = ((step) / (STEPS.length - 1)) * 100

  const canNext = () => {
    if (step === 1) return form.name.trim() && form.age && form.sex
    if (step === 2) return form.weight && form.height
    if (step === 3) return form.activity_level
    if (step === 4) return form.goal
    return true
  }

  async function finish() {
    setSaving(true)
    const age    = Number(form.age)
    const weight = Number(form.weight)
    const height = Number(form.height)

    const tmb     = calcTMB(form.sex, weight, height, age)
    const tdee    = calcTDEE(tmb, form.activity_level)
    const targets = calcTargets(tdee, form.goal, weight)

    const profile = {
      name:           form.name.trim(),
      age,
      sex:            form.sex,
      weight,
      height,
      activity_level: form.activity_level,
      training:       form.training.trim() || 'No especificado',
      goal:           form.goal,
      tmb:            Math.round(tmb),
      tdee:           Math.round(tdee),
      ...targets,
    }

    const { data, error } = await saveUserProfile(userId, profile)
    setSaving(false)
    if (!error && data) onComplete(data)
    else if (!error) onComplete(profile)
  }

  return (
    <div className="flex h-full bg-bg items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="font-syne text-3xl font-bold text-white">NutriAI</h1>
          <p className="text-muted font-dm mt-1">Tu nutricionista personal</p>
        </div>

        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted mb-2 font-dm">
              <span>Paso {step} de {STEPS.length - 1}</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-cal-green rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
          {step === 1 && <StepPersonal form={form} set={set} />}
          {step === 2 && <StepBody     form={form} set={set} />}
          {step === 3 && <StepActivity form={form} set={set} />}
          {step === 4 && <StepGoal     form={form} set={set} />}

          {step > 0 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-white hover:border-muted transition-colors font-dm"
              >
                Atrás
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex-1 py-3 rounded-xl bg-cal-green text-bg font-semibold hover:bg-cal-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-dm"
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={finish}
                  disabled={!canNext() || saving}
                  className="flex-1 py-3 rounded-xl bg-cal-green text-bg font-semibold hover:bg-cal-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-dm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Guardando…</>
                  ) : '¡Empezar!'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepWelcome({ onNext }) {
  return (
    <div className="text-center space-y-4">
      <h2 className="font-syne text-2xl font-bold text-white">¡Hola! Soy NutriAI 👋</h2>
      <p className="text-muted font-dm leading-relaxed">
        Voy a ser tu nutricionista personal. Para armar tu plan necesito conocerte un poco.
        Solo me lleva 2 minutos.
      </p>
      <ul className="text-left space-y-2 text-sm font-dm">
        {['Plan de calorías y macros personalizado','Análisis de tus comidas con IA','Seguimiento diario y semanal','Chat con tu nutricionista 24/7'].map(f => (
          <li key={f} className="flex items-center gap-2 text-muted">
            <span className="text-cal-green">✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onNext}
        className="w-full mt-4 py-3 rounded-xl bg-cal-green text-bg font-semibold hover:bg-cal-green/90 transition-all font-dm"
      >
        ¡Vamos!
      </button>
    </div>
  )
}

function StepPersonal({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="font-syne text-xl font-bold text-white">Datos personales</h2>
      <div>
        <label className={LABEL}>¿Cómo te llamás?</label>
        <input
          className={INPUT}
          placeholder="Tu nombre"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Edad</label>
          <input
            className={INPUT}
            type="number" min="14" max="100"
            placeholder="25"
            value={form.age}
            onChange={e => set('age', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Sexo biológico</label>
          <select className={SELECT} value={form.sex} onChange={e => set('sex', e.target.value)}>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function StepBody({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="font-syne text-xl font-bold text-white">Tu cuerpo</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Peso (kg)</label>
          <input
            className={INPUT}
            type="number" min="30" max="300" step="0.1"
            placeholder="70"
            value={form.weight}
            onChange={e => set('weight', e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL}>Altura (cm)</label>
          <input
            className={INPUT}
            type="number" min="100" max="250"
            placeholder="175"
            value={form.height}
            onChange={e => set('height', e.target.value)}
          />
        </div>
      </div>
      {form.weight && form.height && (
        <p className="text-xs text-muted font-dm">
          IMC: <span className="text-white">{(Number(form.weight) / (Number(form.height) / 100) ** 2).toFixed(1)}</span>
        </p>
      )}
    </div>
  )
}

function StepActivity({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="font-syne text-xl font-bold text-white">Actividad física</h2>
      <div>
        <label className={LABEL}>Nivel de actividad</label>
        <select className={SELECT} value={form.activity_level} onChange={e => set('activity_level', e.target.value)}>
          {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>¿Qué tipo de entrenamiento hacés? (opcional)</label>
        <input
          className={INPUT}
          placeholder="Ej: Pesas 4x/semana, running…"
          value={form.training}
          onChange={e => set('training', e.target.value)}
        />
      </div>
    </div>
  )
}

function StepGoal({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="font-syne text-xl font-bold text-white">¿Cuál es tu objetivo?</h2>
      <div className="space-y-2">
        {Object.entries(GOAL_LABELS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => set('goal', k)}
            className={`
              w-full text-left px-4 py-3 rounded-xl border transition-all font-dm
              ${form.goal === k
                ? 'border-cal-green bg-cal-green/10 text-white'
                : 'border-border bg-card text-muted hover:border-muted hover:text-white'}
            `}
          >
            <span className="font-medium">{v.split(' (')[0]}</span>
            {v.includes('(') && (
              <span className="text-xs ml-2 opacity-60">({v.split('(')[1].replace(')', '')})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
