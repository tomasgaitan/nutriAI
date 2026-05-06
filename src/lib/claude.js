import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-4-6'

let _client = null
function getClient() {
  if (!_client) {
    _client = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_KEY,
      dangerouslyAllowBrowser: true,
    })
  }
  return _client
}

/**
 * Streams a message from Claude and yields text chunks.
 * @param {Array}  messages      - Array of {role, content} objects
 * @param {string} systemPrompt
 * @yields {string} text chunk
 */
export async function* streamMessage(messages, systemPrompt) {
  const client = getClient()

  const stream = client.messages.stream({
    model:      MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages:   messages.map(formatMessage),
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text
    }
  }
}

function formatMessage(msg) {
  if (typeof msg.content === 'string') return msg

  // Already in API format (array of content blocks)
  if (Array.isArray(msg.content)) return msg

  return msg
}
