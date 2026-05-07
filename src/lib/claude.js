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
// Pricing for claude-sonnet-4-6 (USD per token)
export const PRICING = {
  input:          3.00  / 1_000_000,
  output:         15.00 / 1_000_000,
  cache_creation: 3.75  / 1_000_000,
  cache_read:     0.30  / 1_000_000,
}

export function calcCost(usage = {}) {
  return (
    (usage.input_tokens              ?? 0) * PRICING.input +
    (usage.output_tokens             ?? 0) * PRICING.output +
    (usage.cache_creation_input_tokens ?? 0) * PRICING.cache_creation +
    (usage.cache_read_input_tokens   ?? 0) * PRICING.cache_read
  )
}

export async function* streamMessage(messages, systemPrompt, onUsage) {
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

  try {
    const final = await stream.finalMessage()
    onUsage?.(final.usage)
  } catch (_) {}
}

function formatMessage(msg) {
  if (typeof msg.content === 'string') return msg

  // Already in API format (array of content blocks)
  if (Array.isArray(msg.content)) return msg

  return msg
}
