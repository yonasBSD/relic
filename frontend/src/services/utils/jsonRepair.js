/**
 * Attempt to repair common JSON issues:
 * - single-quoted strings (converted to double-quoted)
 * - trailing commas before } or ]
 * - unclosed strings, objects, arrays (truncated JSON)
 *
 * Returns { value, repaired } where repaired=true if the input needed fixing.
 */
export function tryParseJson(content) {
  // Fast path: valid as-is
  try {
    return { value: JSON.parse(content), repaired: false }
  } catch (_) {}

  // Repair and retry
  try {
    return { value: JSON.parse(repairJson(content)), repaired: true }
  } catch (e) {
    throw e
  }
}

/**
 * Convert single-quoted strings to double-quoted strings.
 * Handles: escaping bare " inside, unescaping \' (no longer needed).
 * Leaves double-quoted strings and everything outside strings untouched.
 */
export function normalizeSingleQuotes(s) {
  let result = ''
  let i = 0
  let inDouble = false
  let inSingle = false
  let escaped = false

  while (i < s.length) {
    const ch = s[i]

    if (escaped) {
      escaped = false
      if (inDouble) {
        result += '\\' + ch
      } else if (inSingle) {
        // \' → ' (escape no longer needed inside double quotes)
        // \" → \" (already correct for double-quoted output)
        // \X → \X (preserve all other escapes)
        result += ch === "'" ? "'" : '\\' + ch
      } else {
        result += '\\' + ch
      }
      i++
      continue
    }

    if (ch === '\\') {
      escaped = true
      i++
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      result += '"'
      i++
      continue
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      result += '"'
      i++
      continue
    }

    // Bare " inside a single-quoted string must be escaped in the output
    if (inSingle && ch === '"') {
      result += '\\"'
      i++
      continue
    }

    result += ch
    i++
  }

  return result
}

export function repairJson(str) {
  let s = str.trim()

  // Normalise single-quoted strings to double-quoted
  s = normalizeSingleQuotes(s)

  // Remove trailing commas before closing brackets/braces
  s = s.replace(/,(\s*[}\]])/g, '$1')

  // Walk the string to find unclosed containers and strings
  const stack = []
  let inString = false
  let escaped = false

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }

  // Close any open string
  if (inString) s += '"'

  // Strip trailing comma that may now be just before an auto-closed brace
  s = s.replace(/,(\s*)$/, '$1')

  // Close all open containers in reverse
  while (stack.length > 0) s += stack.pop()

  return s
}
