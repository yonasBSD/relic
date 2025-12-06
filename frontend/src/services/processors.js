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
 * Process text content
 */
export function processText(content) {
  const text = decodeContent(content)
  const metadata = getTextMetadata(text)

  return {
    type: 'text',
    preview: text,
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

  return {
    type: 'html',
    html: text,
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
