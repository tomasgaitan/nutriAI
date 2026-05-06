export default function MessageBubble({ msg, isStreaming }) {
  const isUser = msg.role === 'user'

  const renderContent = () => {
    if (typeof msg.content === 'string') {
      return (
        <p className="whitespace-pre-wrap leading-relaxed text-sm font-dm">
          {msg.content}
          {isStreaming && <span className="typing-cursor" />}
        </p>
      )
    }

    // Array content (image + text)
    if (Array.isArray(msg.content)) {
      return (
        <div className="space-y-2">
          {msg.imagePreview && (
            <img
              src={msg.imagePreview}
              alt="Foto de comida"
              className="max-w-[220px] rounded-xl object-cover border border-border"
            />
          )}
          {msg.content
            .filter(b => b.type === 'text')
            .map((b, i) => (
              <p key={i} className="whitespace-pre-wrap leading-relaxed text-sm font-dm">
                {b.text}
                {isStreaming && <span className="typing-cursor" />}
              </p>
            ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-cal-green/20 flex items-center justify-center text-sm shrink-0 mr-2 mt-1">
          🥗
        </div>
      )}
      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-prot-blue/20 border border-prot-blue/30 text-white rounded-br-sm'
            : 'bg-card border border-border text-gray-200 rounded-bl-sm'}
        `}
      >
        {renderContent()}
        <p className="text-[10px] text-muted mt-1 text-right font-dm">
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

function formatTime(ts) {
  if (!ts) return ''
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
