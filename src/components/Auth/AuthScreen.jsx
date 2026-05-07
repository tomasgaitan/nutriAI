import { useState } from 'react'
import supabase from '../../lib/supabase'

const INPUT = 'w-full bg-card border border-border rounded-xl px-4 py-3 text-white placeholder-muted focus:outline-none focus:border-cal-green transition-colors font-dm text-sm'
const LABEL = 'block text-sm font-medium text-muted mb-2 font-dm'

export default function AuthScreen() {
  const [mode,    setMode]    = useState('login') // 'login' | 'signup'
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [info,    setInfo]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Revisá tu email para confirmar la cuenta, luego iniciá sesión.')
    }

    setLoading(false)
  }

  return (
    <div className="flex h-full bg-bg items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="font-syne text-3xl font-bold text-white">NutriAI</h1>
          <p className="text-muted font-dm mt-1">Tu nutricionista personal</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
          <h2 className="font-syne text-xl font-bold text-white mb-6">
            {mode === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={LABEL}>Email</label>
              <input
                className={INPUT}
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className={LABEL}>Contraseña</label>
              <input
                className={INPUT}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-dm bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-cal-green text-sm font-dm bg-cal-green/10 border border-cal-green/20 rounded-xl px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cal-green text-bg font-semibold hover:bg-cal-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-dm flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Cargando…</>
                : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-muted font-dm mt-4">
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); setInfo(null) }}
              className="text-cal-green hover:underline"
            >
              {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
