import { useState, useRef, useEffect, useCallback } from 'react'
import { streamMessage, calcCost }    from '../../lib/claude'
import { saveMealLog, saveUserProfile, saveUsageLog } from '../../lib/supabase'
import { buildSystemPrompt }          from '../../utils/systemPrompt'
import { parseProtocol }              from '../../utils/protocol'
import MessageBubble                  from './MessageBubble'

const WELCOME = (name) => `¡Hola, ${name.split(' ')[0]}! 👋 Soy NutriAI, tu nutricionista personal.

Puedo ayudarte con:
• Análisis de comidas – mandame una foto y calculo los macros al toque
• Consejos de nutrición – preguntame lo que quieras
• Seguimiento – revisá tu dashboard para ver cómo vas hoy

¿Con qué arrancamos?`

const MEAL_TYPES = [
  { id: 'desayuno',  label: 'Desayuno',  icon: '🍳' },
  { id: 'almuerzo',  label: 'Almuerzo',  icon: '🥗' },
  { id: 'merienda',  label: 'Merienda',  icon: '🍎' },
  { id: 'cena',      label: 'Cena',      icon: '🍽️' },
  { id: 'snack',     label: 'Snack',     icon: '🍿' },
]

export default function ChatInterface({ profile, userId, onMealSaved, onProfileSaved }) {
  const [messages,     setMessages]     = useState(() => [
    { id: 'welcome', role: 'assistant', content: WELCOME(profile.name), timestamp: new Date() }
  ])
  const [inputMode,    setInputMode]    = useState(null)   // null | 'meal' | 'chat'
  const [mealType,     setMealType]     = useState(null)
  const [input,        setInput]        = useState('')
  const [streaming,    setStreaming]    = useState(false)
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const fileRef   = useRef(null)

  const systemPrompt = buildSystemPrompt(profile)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (inputMode) inputRef.current?.focus()
  }, [inputMode])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const resetInput = () => {
    setInputMode(null)
    setMealType(null)
    setInput('')
    clearImage()
  }

  const buildApiMessages = useCallback((msgs) =>
    msgs
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.apiContent ?? m.content }))
  , [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text && !imageFile) return
    if (streaming) return

    // Build text: if meal mode, prefix with type so Claude has full context in one shot
    const finalText = mealType
      ? `Registrar ${mealType}: ${text || '(foto adjunta)'}`
      : text

    let apiContent, displayContent
    if (imageFile) {
      const base64 = imagePreview.split(',')[1]
      const mime   = imageFile.type || 'image/jpeg'
      apiContent = [
        { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
        { type: 'text',  text: finalText },
      ]
      displayContent = apiContent
    } else {
      apiContent    = finalText
      displayContent = finalText
    }

    const userMsg = {
      id:           crypto.randomUUID(),
      role:         'user',
      content:      displayContent,
      apiContent,
      imagePreview: imagePreview,
      timestamp:    new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    resetInput()
    setStreaming(true)

    const assistantId  = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }])

    try {
      let fullText = ''
      const history = buildApiMessages([...messages, userMsg])
      const messageType = imageFile ? 'image' : mealType ? 'meal' : 'chat'

      for await (const chunk of streamMessage(history, systemPrompt, async (usage) => {
        saveUsageLog(userId, {
          message_type:          messageType,
          input_tokens:          usage.input_tokens,
          output_tokens:         usage.output_tokens,
          cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
          cache_read_tokens:     usage.cache_read_input_tokens     ?? 0,
          cost_usd:              calcCost(usage),
        })
      })) {
        fullText += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m))
      }

      const { cleanText, meals, profile: updatedProfile } = parseProtocol(fullText)
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleanText } : m))

      for (const meal of meals) {
        await saveMealLog(userId, meal)
        onMealSaved?.()
      }

      if (updatedProfile) {
        const { data } = await saveUserProfile(userId, updatedProfile)
        if (data) onProfileSaved?.(data)
      }
    } catch (err) {
      console.error('Claude error:', err)
      const errText = err?.status === 401
        ? 'Error de autenticación. Verificá tu VITE_ANTHROPIC_KEY en el archivo .env.'
        : `Ocurrió un error: ${err.message ?? 'desconocido'}`
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: errText } : m))
    }

    setStreaming(false)
  }, [input, imageFile, imagePreview, mealType, streaming, messages, systemPrompt, userId, buildApiMessages, onMealSaved, onProfileSaved])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const selectedMeal = MEAL_TYPES.find(m => m.id === mealType)

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 md:border-r md:border-border">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface shrink-0">
        <div className="w-9 h-9 rounded-full bg-cal-green/20 flex items-center justify-center text-lg">🥗</div>
        <div>
          <h2 className="font-syne font-semibold text-white text-sm">NutriAI</h2>
          <p className="text-[11px] text-cal-green font-dm flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cal-green rounded-full inline-block" />
            Nutricionista personal
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border shrink-0">

        {/* Quick actions — shown when no mode selected */}
        {!inputMode && (
          <div className="px-4 pt-3 pb-3 space-y-2">
            <p className="text-[10px] text-muted font-dm uppercase tracking-wide">Registrar comida</p>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setInputMode('meal'); setMealType(m.id) }}
                  disabled={streaming}
                  className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-sm font-dm text-muted hover:border-cal-green/50 hover:text-white transition-all disabled:opacity-40"
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setInputMode('chat')}
              disabled={streaming}
              className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-sm font-dm text-muted hover:border-prot-blue/50 hover:text-white transition-all disabled:opacity-40"
            >
              <span>💬</span>
              <span>Hacer una consulta</span>
            </button>
          </div>
        )}

        {/* Meal / chat input — shown when mode selected */}
        {inputMode && (
          <div className="px-4 pb-4 pt-3">
            {/* Mode indicator */}
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-dm text-cal-green">
                {inputMode === 'meal' ? (
                  <>{selectedMeal?.icon} {selectedMeal?.label}</>
                ) : (
                  <>💬 Consulta</>
                )}
              </span>
              <button
                onClick={resetInput}
                className="text-xs text-muted hover:text-white font-dm transition-colors"
              >
                ✕ Cancelar
              </button>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="h-14 w-14 rounded-xl object-cover border border-border" />
                  <button
                    onClick={clearImage}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center"
                  >✕</button>
                </div>
                <p className="text-xs text-muted font-dm">Foto lista para analizar</p>
              </div>
            )}

            <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 focus-within:border-cal-green/50 transition-colors">
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImageChange} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={streaming}
                className="p-1.5 text-muted hover:text-carb-orange transition-colors disabled:opacity-40 shrink-0"
                title="Subir foto"
              >📷</button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputMode === 'meal' ? `¿Qué comiste en el ${selectedMeal?.label.toLowerCase()}?` : 'Escribí tu consulta…'}
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent resize-none text-sm text-white placeholder-muted focus:outline-none font-dm py-1 max-h-28 min-h-[28px]"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={send}
                disabled={streaming || (!input.trim() && !imageFile)}
                className="p-1.5 bg-cal-green/20 text-cal-green rounded-xl hover:bg-cal-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                {streaming
                  ? <div className="w-4 h-4 border-2 border-cal-green border-t-transparent rounded-full animate-spin" />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
