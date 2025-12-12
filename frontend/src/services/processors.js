/**
 * Frontend content processors for different file types
 * Processes raw content into formatted previews
 */

import hljs from 'highlight.js'
import { processMarkdown } from './markdownProcessor.js'
import { processPDF } from './pdfProcessor.js'
import { processArchive } from './archiveProcessor.js'
import { processExcalidraw } from './excalidrawProcessor.js'
import { detectLanguageHint, isCodeType, getFileTypeDefinition } from './typeUtils.js'

/**
 * Helper to decode content to string
 */
function decodeContent(content) {
  return typeof content === 'string' ? content : new TextDecoder().decode(content)
}

/**
 * Helper to get common text metadata
 */
function getTextMetadata(text) {
  return {
    lineCount: text.split(/\r?\n/).length,
    charCount: text.length
  }
}

/**
 * Detect programming language from content
 */
export function detectLanguage(content, contentType, languageHint) {
  if (languageHint && languageHint !== 'auto') {
    return languageHint
  }

  // Try to detect from content type using our unified logic
  const detected = detectLanguageHint(contentType)
  if (detected && detected !== 'auto' && detected !== 'text') {
    return detected
  }

  // Try to auto-detect based on content
  try {
    const result = hljs.highlightAuto(content.slice(0, 1000))
    return result.language || 'plaintext'
  } catch (e) {
    return 'plaintext'
  }
}

/**
 * Highlight code with syntax highlighting
 */
export function highlightCode(content, language) {
  try {
    const highlighted = hljs.highlight(content, { language, ignoreIllegals: true })
    return highlighted.value
  } catch (e) {
    // Fallback to plain text if highlighting fails
    return hljs.highlight(content, { language: 'plaintext' }).value
  }
}

/**
 * Parse ANSI escape codes and generate Monaco decorations with full SGR support
 * Returns { text: cleanedText, decorations: [...] }
 */
function parseAnsiCodes(text) {
  // VS Code dark theme color palette (more readable than pure ANSI)
  const fgColorMap = {
    30: '#000000', 31: '#CD3131', 32: '#0DBC79', 33: '#E5E510',
    34: '#2472C8', 35: '#BC3FBC', 36: '#11A8CD', 37: '#E5E5E5',
    90: '#666666', 91: '#F14C4C', 92: '#23D18B', 93: '#F5F543',
    94: '#3B8EEA', 95: '#D670D6', 96: '#29B8DB', 97: '#FFFFFF'
  }

  const bgColorMap = {
    40: '#000000', 41: '#CD3131', 42: '#0DBC79', 43: '#E5E510',
    44: '#2472C8', 45: '#BC3FBC', 46: '#11A8CD', 47: '#E5E5E5',
    100: '#666666', 101: '#F14C4C', 102: '#23D18B', 103: '#F5F543',
    104: '#3B8EEA', 105: '#D670D6', 106: '#29B8DB', 107: '#FFFFFF'
  }

  // 256-color palette (xterm colors)
  const get256Color = (n) => {
    if (n < 16) {
      // VS Code dark theme colors (0-15)
      const stdColors = ['#000000', '#CD3131', '#0DBC79', '#E5E510', '#2472C8', '#BC3FBC', '#11A8CD', '#E5E5E5',
                         '#666666', '#F14C4C', '#23D18B', '#F5F543', '#3B8EEA', '#D670D6', '#29B8DB', '#FFFFFF']
      return stdColors[n]
    } else if (n < 232) {
      // 6x6x6 RGB cube (16-231)
      const idx = n - 16
      const r = Math.floor(idx / 36)
      const g = Math.floor((idx % 36) / 6)
      const b = idx % 6
      const toHex = (v) => (v === 0 ? 0 : 55 + v * 40).toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    } else {
      // Grayscale (232-255)
      const gray = 8 + (n - 232) * 10
      const hex = gray.toString(16).padStart(2, '0')
      return `#${hex}${hex}${hex}`
    }
  }

  const decorations = []
  let cleanText = ''
  let rangeStart = 0

  // Current style state
  const state = {
    fgColor: null,
    bgColor: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    blink: false,
    reverse: false,
    hidden: false,
    strikethrough: false
  }

  const hasActiveStyle = () => {
    return state.fgColor || state.bgColor || state.bold || state.dim ||
           state.italic || state.underline || state.blink || state.reverse ||
           state.hidden || state.strikethrough
  }

  const saveDecoration = () => {
    if (hasActiveStyle() && cleanText.length > rangeStart) {
      const options = {}
      if (state.fgColor) options.color = state.fgColor
      if (state.bgColor) options.backgroundColor = state.bgColor
      if (state.bold) options.bold = true
      if (state.dim) options.dim = true
      if (state.italic) options.italic = true
      if (state.underline) options.underline = true
      if (state.blink) options.blink = true
      if (state.reverse) options.reverse = true
      if (state.hidden) options.hidden = true
      if (state.strikethrough) options.strikethrough = true

      decorations.push({
        range: { start: rangeStart, end: cleanText.length },
        options
      })
    }
  }

  // eslint-disable-next-line no-control-regex
  const parts = text.split(/(\x1B\[[0-9;]*[a-zA-Z])/)

  for (const part of parts) {
    // eslint-disable-next-line no-control-regex
    const match = part.match(/^\x1B\[([0-9;]*)([a-zA-Z])$/)

    if (match) {
      const codes = match[1] ? match[1].split(';').map(Number) : [0]
      const command = match[2]

      if (command === 'm') {
        // Save current decoration before changing state
        saveDecoration()

        // Process SGR codes
        let i = 0
        while (i < codes.length) {
          const code = codes[i]

          if (code === 0) {
            // Reset all attributes
            Object.keys(state).forEach(key => state[key] = key.includes('Color') ? null : false)
          } else if (code === 1) {
            state.bold = true
          } else if (code === 2) {
            state.dim = true
          } else if (code === 3) {
            state.italic = true
          } else if (code === 4) {
            state.underline = true
          } else if (code === 5 || code === 6) {
            state.blink = true
          } else if (code === 7) {
            state.reverse = true
          } else if (code === 8) {
            state.hidden = true
          } else if (code === 9) {
            state.strikethrough = true
          } else if (code === 22) {
            state.bold = false
            state.dim = false
          } else if (code === 23) {
            state.italic = false
          } else if (code === 24) {
            state.underline = false
          } else if (code === 25) {
            state.blink = false
          } else if (code === 27) {
            state.reverse = false
          } else if (code === 28) {
            state.hidden = false
          } else if (code === 29) {
            state.strikethrough = false
          } else if (code >= 30 && code <= 37) {
            state.fgColor = fgColorMap[code]
          } else if (code === 38) {
            // Extended foreground color
            if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
              // 256-color mode
              state.fgColor = get256Color(codes[i + 2])
              i += 2
            } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
              // RGB mode
              const r = codes[i + 2]
              const g = codes[i + 3]
              const b = codes[i + 4]
              state.fgColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
              i += 4
            }
          } else if (code === 39) {
            state.fgColor = null
          } else if (code >= 40 && code <= 47) {
            state.bgColor = bgColorMap[code]
          } else if (code === 48) {
            // Extended background color
            if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
              // 256-color mode
              state.bgColor = get256Color(codes[i + 2])
              i += 2
            } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
              // RGB mode
              const r = codes[i + 2]
              const g = codes[i + 3]
              const b = codes[i + 4]
              state.bgColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
              i += 4
            }
          } else if (code === 49) {
            state.bgColor = null
          } else if (code >= 90 && code <= 97) {
            state.fgColor = fgColorMap[code]
          } else if (code >= 100 && code <= 107) {
            state.bgColor = bgColorMap[code]
          }

          i++
        }

        rangeStart = cleanText.length
      }
    } else if (part) {
      cleanText += part
    }
  }

  // Save final decoration
  saveDecoration()

  return { text: cleanText, decorations }
}

/**
 * Check if text contains ANSI escape codes
 */
function containsAnsiCodes(text) {
  // eslint-disable-next-line no-control-regex
  return /\x1B\[[0-9;]*[a-zA-Z]/.test(text)
}

/**
 * Determine if ANSI processing should be enabled by default for this file
 */
export function shouldEnableAnsiByDefault(metadata, contentType, language) {
  const ct = (contentType || '').toLowerCase()
  const lang = (language || '').toLowerCase()

  // Enable for log files
  if (ct.includes('log') || lang === 'log') return true
  if (metadata && (metadata.language === 'log' || metadata.language === 'text')) {
    // Check if filename suggests it's a log
    return true
  }

  // Disable for code files and structured data
  const codeExtensions = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp',
    'csharp', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'groovy', 'gradle',
    'html', 'xml', 'json', 'yaml', 'css', 'scss', 'less', 'sql', 'dockerfile',
    'makefile', 'bash', 'sh', 'zsh', 'ps1', 'ps2'
  ]

  if (codeExtensions.includes(lang)) return false

  // Default to OFF unless explicitly detected as log
  return false
}

/**
 * Process text content
 */
export function processText(content, contentType = null, languageHint = null) {
  const text = decodeContent(content)
  const metadata = getTextMetadata(text)

  // Check for ANSI codes and parse them for Monaco decorations
  if (containsAnsiCodes(text)) {
    const { text: cleanText, decorations } = parseAnsiCodes(text)

    // Determine if ANSI should be enabled by default
    const ansiEnabled = shouldEnableAnsiByDefault(metadata, contentType, languageHint)

    return {
      type: 'text',
      preview: cleanText,
      ansiDecorations: decorations,
      ansiEnabled: ansiEnabled,
      hasAnsiCodes: true,
      metadata: {
        ...metadata,
        hasAnsiCodes: true,
        wordCount: cleanText.split(/\s+/).length
      }
    }
  }

  return {
    type: 'text',
    preview: text,
    ansiEnabled: false,
    hasAnsiCodes: false,
    metadata: {
      ...metadata,
      wordCount: text.split(/\s+/).length
    }
  }
}

/**
 * Process code content with syntax highlighting
 */
export function processCode(content, contentType, languageHint) {
  const text = decodeContent(content)
  const language = detectLanguage(text, contentType, languageHint)
  const metadata = getTextMetadata(text)

  return {
    type: 'code',
    preview: text,
    highlighted: highlightCode(text, language),
    metadata: {
      ...metadata,
      language
    }
  }
}

/**
 * Process image content
 */
export function processImage(content, contentType) {
  // Use the specific content type for proper MIME type handling
  const mimeType = contentType || 'image/*'
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  return {
    type: 'image',
    url,
    metadata: {
      mimeType,
      // Additional metadata would need canvas inspection for raster images
    }
  }
}

/**
 * Process markdown content
 */
export { processMarkdown }

/**
 * Process HTML content
 */
export function processHTML(content) {
  const text = decodeContent(content)

  // Inject navigation interception script to prevent recursive iframe loading
  // This script intercepts link clicks and either:
  // 1. Navigates the parent app to the relic (if link is to a relic ID)
  // 2. Opens external links in a new tab
  const navigationScript = `
<script>
(function() {
  // Prevent iframe navigation that causes recursive navigation bar rendering
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;

    try {
      const url = new URL(link.href);
      const path = url.pathname;

      // Check if this looks like a relic ID (32-char hex string)
      const parts = path.split('/').filter(p => p);
      if (parts.length >= 1 && /^[a-f0-9]{32}$/i.test(parts[0])) {
        // Navigate parent window to this relic
        e.preventDefault();
        if (window.parent) {
          window.parent.location.href = path;
        } else {
          window.top.location.href = path;
        }
        return;
      }

      // For all other links, open in new tab to prevent iframe navigation
      if (link.target !== '_blank') {
        e.preventDefault();
        window.open(link.href, '_blank');
      }
    } catch (err) {
      // If URL parsing fails, let the link work normally
      console.error('Link navigation error:', err);
    }
  }, true);
})();
</script>
  `.trim();

  // Inject the script before </body> or at the end if no body tag
  let injectedHtml = text;
  if (/<\/body>/i.test(text)) {
    injectedHtml = text.replace(/<\/body>/i, `${navigationScript}\n</body>`);
  } else if (/<\/html>/i.test(text)) {
    injectedHtml = text.replace(/<\/html>/i, `${navigationScript}\n</html>`);
  } else {
    injectedHtml = text + '\n' + navigationScript;
  }

  return {
    type: 'html',
    html: injectedHtml,
    metadata: {
      charCount: text.length,
      // Basic HTML structure validation
      hasDoctype: text.toLowerCase().includes('<!doctype'),
      hasHtmlTag: text.toLowerCase().includes('<html'),
      hasBodyTag: text.toLowerCase().includes('<body')
    }
  }
}

/**
 * Process CSV content
 */
export function processCSV(content) {
  const text = decodeContent(content)
  const lines = text.split(/\r?\n/)
  const headers = lines[0]?.split(',').map(h => h.trim()) || []
  const rows = lines.slice(1).map(line => {
    const cells = line.split(',')
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = cells[idx]?.trim() || ''
    })
    return row
  })

  return {
    type: 'csv',
    rows,
    metadata: {
      columnCount: headers.length,
      rowCount: lines.length - 1,
      columns: headers,
      fileSize: content.byteLength || text.length
    }
  }
}

/**
 * Process a relic index file (list of relic IDs)
 * Supports both simple list of IDs and structured YAML with metadata
 */
async function processRelicIndex(content) {
  const text = decodeContent(content)
  const lines = text.split('\n')
  const relicIds = []
  let title = 'Relic Index'
  let description = ''

  // Simple check if it's structured YAML
  const isStructured = text.includes('relics:')

  if (isStructured) {
    // Basic YAML parsing for our specific format to avoid heavy dependency
    let inRelics = false
    let currentRelic = null

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('title:')) {
        if (!inRelics) title = trimmed.substring(6).trim()
        else if (currentRelic) currentRelic.title = trimmed.substring(6).trim()
      } else if (trimmed.startsWith('description:')) {
        if (!inRelics) description = trimmed.substring(12).trim()
        else if (currentRelic) currentRelic.description = trimmed.substring(12).trim()
      } else if (trimmed.startsWith('relics:')) {
        inRelics = true
      } else if (inRelics && trimmed.startsWith('- id:')) {
        const id = trimmed.substring(5).trim()
        if (/^[a-f0-9]{32}$/i.test(id)) {
          currentRelic = { id }
          relicIds.push(currentRelic)
        }
      } else if (inRelics && trimmed.startsWith('tags:')) {
        // Simple tag parsing [tag1, tag2]
        if (currentRelic) {
          const tagsContent = trimmed.substring(5).trim()
          if (tagsContent.startsWith('[') && tagsContent.endsWith(']')) {
            currentRelic.tags = tagsContent.slice(1, -1).split(',').map(t => t.trim())
          }
        }
      }
    }
  } else {
    // Fallback to simple ID scanning
    const idPattern = /\b[a-f0-9]{32}\b/g
    let match
    while ((match = idPattern.exec(text)) !== null) {
      relicIds.push({ id: match[0] })
    }
  }

  return {
    type: 'relicindex',
    relics: relicIds,
    meta: {
      title,
      description,
      count: relicIds.length
    }
  }
}

/**
 * Check if content looks like a relic index
 */
export function isRelicIndex(content, contentType) {
  // If explicitly identified as relic index by extension/mime
  if (contentType === 'application/x-relic-index') return true

  // Don't treat binary formats (archives, PDFs, images) as relic indexes
  const typeDef = getFileTypeDefinition(contentType)
  if (typeDef.category === 'archive' || typeDef.category === 'pdf' || typeDef.category === 'image') {
    return false
  }

  const text = decodeContent(content)

  // Check for structured format signature
  if (text.includes('relics:') && text.includes('- id:')) return true

  // Fallback heuristic for simple lists
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return false

  const idPattern = /^[a-f0-9]{32}$/
  const listItemPattern = /^-\s+[a-f0-9]{32}$/

  let matchCount = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (idPattern.test(trimmed) || listItemPattern.test(trimmed)) {
      matchCount++
    }
  }

  return matchCount > 0 && (matchCount / lines.length) > 0.5
}



/**
 * Main processor function that delegates to type-specific processors
 */
export async function processContent(content, contentType, languageHint) {
  // Check language hint first for specific overrides
  if (languageHint === 'markdown' || languageHint === 'md') {
    return processMarkdown(content)
  }

  // Check for relicindex
  if (isRelicIndex(content, contentType)) {
    return processRelicIndex(content)
  }

  const typeDef = getFileTypeDefinition(contentType)

  switch (typeDef.category) {
    case 'html':
      return processHTML(content)
    case 'markdown':
      return processMarkdown(content)
    case 'pdf':
      return processPDF(content)
    case 'csv':
      return processCSV(content)
    case 'image':
      return processImage(content, contentType)
    case 'archive':
      return processArchive(content, contentType)
    case 'excalidraw':
      return processExcalidraw(content, contentType)
    case 'code':
      return processCode(content, contentType, languageHint)
    case 'text':
      return processText(content)
    default:
      // Fallback for unknown types that might still be code
      if (isCodeType(contentType)) {
        return processCode(content, contentType, languageHint)
      }
      return processText(content)
  }
}
