const MEAL_RE    = /<<<SAVE_MEAL>>>([\s\S]*?)<<<END_MEAL>>>/g
const PROFILE_RE = /<<<SAVE_PROFILE>>>([\s\S]*?)<<<END_PROFILE>>>/g

export function parseProtocol(text) {
  let clean   = text
  const meals = []
  let profile = null

  let m
  MEAL_RE.lastIndex = 0
  while ((m = MEAL_RE.exec(text)) !== null) {
    try {
      meals.push(JSON.parse(m[1].trim()))
      clean = clean.replace(m[0], '')
    } catch { /* malformed JSON – skip */ }
  }

  PROFILE_RE.lastIndex = 0
  while ((m = PROFILE_RE.exec(text)) !== null) {
    try {
      profile = JSON.parse(m[1].trim())
      clean = clean.replace(m[0], '')
    } catch { /* malformed JSON – skip */ }
  }

  return { cleanText: clean.trim(), meals, profile }
}
