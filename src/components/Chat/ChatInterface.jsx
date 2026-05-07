import { useState, useRef, useEffect, useCallback } from 'react'
import { streamMessage }     from '../../lib/claude'
import { saveMealLog, saveUserProfile } from '../../lib/supabase'
import { buildSystemPrompt } from '../../utils/systemPrompt'
import { parseProtocol }     from '../../utils/protocol'
import { getUserId }         from '../../lib/userId'
import MessageBubble         from './MessageBubble'

const WELCOME = (name) => `¡Hola, ${name.split(' ')[0]}! 👋 Soy NutriAI, tu nutricionista personal.

Puedo ayudarte con:
• Análisis de comidas – mandame una foto y calculo los macros al toque
• Consejos de nutrición – preguntame lo que quieras
• Seguimiento – revisá tu dashboard para ver cómo vas hoy

¿Con qué arrancamos?`

export default function ChatInterface({ profile, userId, onMealSaved, onProfileSaved }) {
  const [messages,    setMessages]    = useState(() => [
    { id: 'welcome', role: 'assistant', content: WELCOME(profile.name), timestamp: new Date() }
  ])
  const [input,       setInput]       = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [imageFile,   setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const fileRef    = useRef(null)

  const systemPrompt = buildSystemPrompt(profile)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const buildApiMessages = useCallback((msgs) => {
    // Convert display messages to Claude API format (exclude welcome stub)
    return msgs
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role:    m.role,
        content: m.apiContent ?? m.content,
      }))
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text && !imageFile) return
    if (streaming) return

    // Build user message
    let apiContent
    let displayContent
    let preview = imagePreview

    if (imageFile) {
      const base64 = imagePreview.split(',')[1]
      const mime   = imageFile.type || 'image/jpeg'
      apiContent = [
        { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
        { type: 'text',  text: text || '¿Qué tiene esta comida? ¿Cuántas calorías y macros tiene?' },
      ]
      displayContent = apiContent
    } else {
      apiContent    = text
      displayContent = text
    }

    const userMsg = {
      id:           crypto.randomUUID(),
      role:         'user',
      content:      displayContent,
      apiContent,
      imagePreview: preview,
      timestamp:    new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    clearImage()
    setStreaming(true)

    const assistantId = crypto.randomUUID()
    const assistantMsg = {
      id:        assistantId,
      role:      'assistant',
      content:   '',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      let fullText = ''
      const history = buildApiMessages([...messages, userMsg])

      for await (const chunk of streamMessage(history, systemPrompt)) {
        fullText += chunk
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        )
      }

      // Parse and strip protocol markers
      const { cleanText, meals, profile: updatedProfile } = parseProtocol(fullText)

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: cleanText } : m)
      )

      // Persist meals
      for (const meal of meals) {
        await saveMealLog(userId, meal)
        onMealSaved?.()
      }

      // Persist updated profile
      if (updatedProfile) {
        const { data } = await saveUserProfile(userId, updatedProfile)
        if (data) onProfileSaved?.(data)
      }

    } catch (err) {
      console.error('Claude error:', err)
      const errText = err?.status === 401
        ? 'Error de autenticación. Verificá tu VITE_ANTHROPIC_KEY en el archivo .env.'
        : `Ocurrió un error: ${err.message ?? 'desconocido'}`
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: errText } : m)
      )
    }

    setStreaming(false)
    inputRef.current?.focus()
  }, [input, imageFile, imagePreview, streaming, messages, systemPrompt, userId, buildApiMessages, onMealSaved, onProfileSaved])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 md:border-r md:border-border">
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

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="relative">
            <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-xl object-cover border border-border" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-600"
            >✕</button>
          </div>
          <p className="text-xs text-muted font-dm">Foto lista para analizar</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 focus-within:border-cal-green/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={streaming}
            title="Subir foto de comida"
            className="p-1.5 text-muted hover:text-carb-orange transition-colors disabled:opacity-40 shrink-0"
          >
            📷
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu consulta o subí una foto…"
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
        <p className="text-[10px] text-muted text-center mt-1.5 font-dm">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
